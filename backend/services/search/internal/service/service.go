package service

import (
	"context"

	"github.com/civitro/pkg/logger"
	"github.com/civitro/pkg/translate"
	"github.com/civitro/services/search/internal/model"
	"github.com/civitro/services/search/internal/repository"
)

// Service implements the search business logic.
type Service struct {
	repo       *repository.Repository
	translator *translate.Client
}

// New creates a new search service.
func New(repo *repository.Repository, translator *translate.Client) *Service {
	return &Service{repo: repo, translator: translator}
}

// Search executes a search query across OpenSearch indices.
// If the query is in a non-English language, it is translated to English before
// searching (since content is indexed in English via text_en). The original
// query is preserved in the response.
func (s *Service) Search(ctx context.Context, query model.SearchQuery) (*model.SearchResponse, error) {
	query.Defaults()

	originalQuery := query.Query

	// Detect query language and translate to English if needed.
	if s.translator != nil && query.Query != "" {
		detectedLang, err := s.translator.DetectLanguage(ctx, query.Query)
		if err == nil && detectedLang != "en" {
			if translatedQuery, err := s.translator.Translate(ctx, query.Query, detectedLang, "en"); err == nil {
				logger.Info().
					Str("original_query", query.Query).
					Str("translated_query", translatedQuery).
					Str("detected_lang", detectedLang).
					Msg("translated search query to English")
				query.Query = translatedQuery
			} else {
				logger.Warn().Err(err).Str("query", query.Query).Msg("search query translation failed, using original")
			}
		}
	}

	logger.Info().
		Str("query", query.Query).
		Str("type", string(query.Type)).
		Str("boundary_id", query.BoundaryID).
		Int("page", query.Page).
		Int("limit", query.Limit).
		Msg("executing search")

	results, total, err := s.repo.SearchDocuments(ctx, query)
	if err != nil {
		logger.Error().Err(err).Str("query", query.Query).Msg("search failed")
		return nil, err
	}

	return &model.SearchResponse{
		Query:   originalQuery,
		Type:    query.Type,
		Results: results,
		Page:    query.Page,
		Limit:   query.Limit,
		Total:   total,
	}, nil
}

// GetTrending retrieves trending items, optionally filtered by type.
func (s *Service) GetTrending(ctx context.Context, trendType string, limit int) ([]model.TrendingItem, error) {
	logger.Info().Str("type", trendType).Int("limit", limit).Msg("fetching trending items")

	items, err := s.repo.GetTrending(ctx, trendType, limit)
	if err != nil {
		logger.Error().Err(err).Msg("failed to get trending")
		return nil, err
	}

	return items, nil
}

// Autocomplete returns prefix-based autocomplete suggestions.
func (s *Service) Autocomplete(ctx context.Context, prefix string, limit int) ([]model.AutocompleteResult, error) {
	if limit <= 0 || limit > 20 {
		limit = 10
	}

	logger.Info().Str("prefix", prefix).Int("limit", limit).Msg("autocomplete query")

	results, err := s.repo.Autocomplete(ctx, prefix, limit)
	if err != nil {
		logger.Error().Err(err).Str("prefix", prefix).Msg("autocomplete failed")
		return nil, err
	}

	return results, nil
}

// GetTrendingHashtags retrieves trending hashtags specifically.
func (s *Service) GetTrendingHashtags(ctx context.Context, limit int) ([]model.TrendingItem, error) {
	logger.Info().Int("limit", limit).Msg("fetching trending hashtags")

	items, err := s.repo.GetTrending(ctx, "hashtag", limit)
	if err != nil {
		logger.Error().Err(err).Msg("failed to get trending hashtags")
		return nil, err
	}

	return items, nil
}

// IndexDocument indexes a document into OpenSearch. Called via Kafka consumer.
func (s *Service) IndexDocument(ctx context.Context, req model.IndexDocumentRequest) error {
	logger.Info().Str("index", req.Index).Str("id", req.ID).Msg("indexing document")

	if err := s.repo.IndexDocument(ctx, req.Index, req.ID, req.Document); err != nil {
		logger.Error().Err(err).Str("index", req.Index).Str("id", req.ID).Msg("failed to index document")
		return err
	}

	return nil
}

// DeleteDocument removes a document from OpenSearch.
func (s *Service) DeleteDocument(ctx context.Context, index, id string) error {
	logger.Info().Str("index", index).Str("id", id).Msg("deleting document")

	if err := s.repo.DeleteDocument(ctx, index, id); err != nil {
		logger.Error().Err(err).Str("index", index).Str("id", id).Msg("failed to delete document")
		return err
	}

	return nil
}
