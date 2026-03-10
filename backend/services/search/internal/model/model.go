package model

// SearchType enumerates searchable content types.
type SearchType string

const (
	SearchTypeAll      SearchType = "all"
	SearchTypeVoices   SearchType = "voices"
	SearchTypeIssues   SearchType = "issues"
	SearchTypeLeaders  SearchType = "leaders"
	SearchTypeHashtags SearchType = "hashtags"
	SearchTypePromises SearchType = "promises"
)

// OpenSearch index names.
const (
	IndexVoices   = "voices"
	IndexIssues   = "issues"
	IndexLeaders  = "leaders"
	IndexHashtags = "hashtags"
	IndexPromises = "promises"
)

// SearchQuery represents an incoming search request.
type SearchQuery struct {
	Query      string     `json:"query" form:"q" binding:"required"`
	Type       SearchType `json:"type" form:"type"`
	BoundaryID string     `json:"boundary_id" form:"boundary"`
	Page       int        `json:"page" form:"page"`
	Limit      int        `json:"limit" form:"limit"`
}

// Defaults applies default pagination values.
func (q *SearchQuery) Defaults() {
	if q.Type == "" {
		q.Type = SearchTypeAll
	}
	if q.Page < 1 {
		q.Page = 1
	}
	if q.Limit < 1 || q.Limit > 50 {
		q.Limit = 20
	}
}

// SearchResult represents a single search result item.
type SearchResult struct {
	Type     SearchType             `json:"type"`
	ID       string                 `json:"id"`
	Title    string                 `json:"title"`
	Snippet  string                 `json:"snippet"`
	Score    float64                `json:"score"`
	Metadata map[string]interface{} `json:"metadata,omitempty"`
}

// SearchResponse is the paginated response for a search query.
type SearchResponse struct {
	Query   string         `json:"query"`
	Type    SearchType     `json:"type"`
	Results []SearchResult `json:"results"`
	Page    int            `json:"page"`
	Limit   int            `json:"limit"`
	Total   int64          `json:"total"`
}

// TrendingItem represents a trending keyword or topic.
type TrendingItem struct {
	Keyword         string  `json:"keyword"`
	Type            string  `json:"type"`
	Velocity        float64 `json:"velocity"`
	EngagementScore float64 `json:"engagement_score"`
	RecencyScore    float64 `json:"recency_score"`
	CombinedScore   float64 `json:"combined_score"`
}

// AutocompleteResult represents a single autocomplete suggestion.
type AutocompleteResult struct {
	Text string     `json:"text"`
	Type SearchType `json:"type"`
}

// IndexDocumentRequest is used when indexing a document via Kafka consumer.
type IndexDocumentRequest struct {
	Index    string                 `json:"index"`
	ID       string                 `json:"id"`
	Document map[string]interface{} `json:"document"`
}
