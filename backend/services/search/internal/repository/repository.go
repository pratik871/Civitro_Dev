package repository

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"

	"github.com/civitro/services/search/internal/model"
)

// Repository provides OpenSearch operations for the search service.
type Repository struct {
	baseURL    string
	httpClient *http.Client
}

// New creates a new search repository connected to OpenSearch.
func New(opensearchURL string) *Repository {
	return &Repository{
		baseURL: opensearchURL,
		httpClient: &http.Client{
			Timeout: 10 * time.Second,
		},
	}
}

// opensearchResponse represents the raw OpenSearch search response.
type opensearchResponse struct {
	Hits struct {
		Total struct {
			Value int64 `json:"value"`
		} `json:"total"`
		Hits []struct {
			Index  string                 `json:"_index"`
			ID     string                 `json:"_id"`
			Score  float64                `json:"_score"`
			Source map[string]interface{} `json:"_source"`
		} `json:"hits"`
	} `json:"hits"`
}

// SearchDocuments searches across one or more OpenSearch indices.
func (r *Repository) SearchDocuments(ctx context.Context, query model.SearchQuery) ([]model.SearchResult, int64, error) {
	indices := r.resolveIndices(query.Type)
	from := (query.Page - 1) * query.Limit

	body := map[string]interface{}{
		"from": from,
		"size": query.Limit,
		"query": map[string]interface{}{
			"bool": map[string]interface{}{
				"must": []map[string]interface{}{
					{
						"multi_match": map[string]interface{}{
							"query":  query.Query,
							"fields": []string{"title^3", "body^2", "name^3", "description", "text", "tags"},
							"type":   "best_fields",
						},
					},
				},
			},
		},
	}

	// Add boundary filter if specified.
	if query.BoundaryID != "" {
		boolQuery := body["query"].(map[string]interface{})["bool"].(map[string]interface{})
		boolQuery["filter"] = []map[string]interface{}{
			{
				"term": map[string]interface{}{
					"boundary_id": query.BoundaryID,
				},
			},
		}
	}

	reqBody, err := json.Marshal(body)
	if err != nil {
		return nil, 0, fmt.Errorf("marshal search body: %w", err)
	}

	url := fmt.Sprintf("%s/%s/_search", r.baseURL, strings.Join(indices, ","))
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, url, bytes.NewReader(reqBody))
	if err != nil {
		return nil, 0, fmt.Errorf("create search request: %w", err)
	}
	req.Header.Set("Content-Type", "application/json")

	resp, err := r.httpClient.Do(req)
	if err != nil {
		return nil, 0, fmt.Errorf("execute search: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		respBody, _ := io.ReadAll(resp.Body)
		return nil, 0, fmt.Errorf("opensearch error %d: %s", resp.StatusCode, string(respBody))
	}

	var osResp opensearchResponse
	if err := json.NewDecoder(resp.Body).Decode(&osResp); err != nil {
		return nil, 0, fmt.Errorf("decode search response: %w", err)
	}

	results := make([]model.SearchResult, 0, len(osResp.Hits.Hits))
	for _, hit := range osResp.Hits.Hits {
		title, _ := hit.Source["title"].(string)
		if title == "" {
			title, _ = hit.Source["name"].(string)
		}
		snippet, _ := hit.Source["body"].(string)
		if snippet == "" {
			snippet, _ = hit.Source["description"].(string)
		}
		if len(snippet) > 200 {
			snippet = snippet[:200] + "..."
		}

		results = append(results, model.SearchResult{
			Type:     model.SearchType(hit.Index),
			ID:       hit.ID,
			Title:    title,
			Snippet:  snippet,
			Score:    hit.Score,
			Metadata: hit.Source,
		})
	}

	return results, osResp.Hits.Total.Value, nil
}

// IndexDocument indexes or updates a document in OpenSearch.
func (r *Repository) IndexDocument(ctx context.Context, index, id string, document map[string]interface{}) error {
	reqBody, err := json.Marshal(document)
	if err != nil {
		return fmt.Errorf("marshal document: %w", err)
	}

	url := fmt.Sprintf("%s/%s/_doc/%s", r.baseURL, index, id)
	req, err := http.NewRequestWithContext(ctx, http.MethodPut, url, bytes.NewReader(reqBody))
	if err != nil {
		return fmt.Errorf("create index request: %w", err)
	}
	req.Header.Set("Content-Type", "application/json")

	resp, err := r.httpClient.Do(req)
	if err != nil {
		return fmt.Errorf("execute index: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK && resp.StatusCode != http.StatusCreated {
		respBody, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("opensearch index error %d: %s", resp.StatusCode, string(respBody))
	}

	return nil
}

// DeleteDocument removes a document from an OpenSearch index.
func (r *Repository) DeleteDocument(ctx context.Context, index, id string) error {
	url := fmt.Sprintf("%s/%s/_doc/%s", r.baseURL, index, id)
	req, err := http.NewRequestWithContext(ctx, http.MethodDelete, url, nil)
	if err != nil {
		return fmt.Errorf("create delete request: %w", err)
	}

	resp, err := r.httpClient.Do(req)
	if err != nil {
		return fmt.Errorf("execute delete: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK && resp.StatusCode != http.StatusNotFound {
		respBody, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("opensearch delete error %d: %s", resp.StatusCode, string(respBody))
	}

	return nil
}

// GetTrending retrieves trending items from the trending aggregation index.
func (r *Repository) GetTrending(ctx context.Context, trendType string, limit int) ([]model.TrendingItem, error) {
	if limit <= 0 || limit > 50 {
		limit = 20
	}

	body := map[string]interface{}{
		"size": limit,
		"sort": []map[string]interface{}{
			{"combined_score": map[string]interface{}{"order": "desc"}},
		},
	}

	if trendType != "" {
		body["query"] = map[string]interface{}{
			"term": map[string]interface{}{
				"type": trendType,
			},
		}
	}

	reqBody, err := json.Marshal(body)
	if err != nil {
		return nil, fmt.Errorf("marshal trending query: %w", err)
	}

	url := fmt.Sprintf("%s/trending/_search", r.baseURL)
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, url, bytes.NewReader(reqBody))
	if err != nil {
		return nil, fmt.Errorf("create trending request: %w", err)
	}
	req.Header.Set("Content-Type", "application/json")

	resp, err := r.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("execute trending query: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		respBody, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("opensearch trending error %d: %s", resp.StatusCode, string(respBody))
	}

	var osResp opensearchResponse
	if err := json.NewDecoder(resp.Body).Decode(&osResp); err != nil {
		return nil, fmt.Errorf("decode trending response: %w", err)
	}

	items := make([]model.TrendingItem, 0, len(osResp.Hits.Hits))
	for _, hit := range osResp.Hits.Hits {
		keyword, _ := hit.Source["keyword"].(string)
		itemType, _ := hit.Source["type"].(string)
		velocity, _ := hit.Source["velocity"].(float64)
		engScore, _ := hit.Source["engagement_score"].(float64)
		recScore, _ := hit.Source["recency_score"].(float64)
		comScore, _ := hit.Source["combined_score"].(float64)

		items = append(items, model.TrendingItem{
			Keyword:         keyword,
			Type:            itemType,
			Velocity:        velocity,
			EngagementScore: engScore,
			RecencyScore:    recScore,
			CombinedScore:   comScore,
		})
	}

	return items, nil
}

// Autocomplete returns prefix-based autocomplete suggestions.
func (r *Repository) Autocomplete(ctx context.Context, prefix string, limit int) ([]model.AutocompleteResult, error) {
	if limit <= 0 || limit > 20 {
		limit = 10
	}

	body := map[string]interface{}{
		"size": limit,
		"query": map[string]interface{}{
			"multi_match": map[string]interface{}{
				"query":  prefix,
				"fields": []string{"title.autocomplete", "name.autocomplete", "text.autocomplete"},
				"type":   "phrase_prefix",
			},
		},
		"_source": []string{"title", "name", "_index"},
	}

	reqBody, err := json.Marshal(body)
	if err != nil {
		return nil, fmt.Errorf("marshal autocomplete query: %w", err)
	}

	allIndices := strings.Join([]string{
		model.IndexVoices, model.IndexIssues, model.IndexLeaders,
		model.IndexHashtags, model.IndexPromises,
	}, ",")
	url := fmt.Sprintf("%s/%s/_search", r.baseURL, allIndices)

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, url, bytes.NewReader(reqBody))
	if err != nil {
		return nil, fmt.Errorf("create autocomplete request: %w", err)
	}
	req.Header.Set("Content-Type", "application/json")

	resp, err := r.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("execute autocomplete: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		respBody, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("opensearch autocomplete error %d: %s", resp.StatusCode, string(respBody))
	}

	var osResp opensearchResponse
	if err := json.NewDecoder(resp.Body).Decode(&osResp); err != nil {
		return nil, fmt.Errorf("decode autocomplete response: %w", err)
	}

	results := make([]model.AutocompleteResult, 0, len(osResp.Hits.Hits))
	for _, hit := range osResp.Hits.Hits {
		text, _ := hit.Source["title"].(string)
		if text == "" {
			text, _ = hit.Source["name"].(string)
		}
		results = append(results, model.AutocompleteResult{
			Text: text,
			Type: model.SearchType(hit.Index),
		})
	}

	return results, nil
}

// resolveIndices returns the OpenSearch indices to query based on search type.
func (r *Repository) resolveIndices(searchType model.SearchType) []string {
	switch searchType {
	case model.SearchTypeVoices:
		return []string{model.IndexVoices}
	case model.SearchTypeIssues:
		return []string{model.IndexIssues}
	case model.SearchTypeLeaders:
		return []string{model.IndexLeaders}
	case model.SearchTypeHashtags:
		return []string{model.IndexHashtags}
	case model.SearchTypePromises:
		return []string{model.IndexPromises}
	default:
		return []string{
			model.IndexVoices, model.IndexIssues, model.IndexLeaders,
			model.IndexHashtags, model.IndexPromises,
		}
	}
}
