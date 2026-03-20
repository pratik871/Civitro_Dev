-- ============================================================================
-- Migration 000007: Add issue_upvotes, issue_comments, issue_comment_likes
-- These tables are referenced by the issues service but were missing from 000001.
-- Also expand the issues.category CHECK to match all Go model categories.
-- ============================================================================

-- Expand category CHECK constraint to include all categories used by Go service
ALTER TABLE issues DROP CONSTRAINT IF EXISTS issues_category_check;
ALTER TABLE issues ADD CONSTRAINT issues_category_check CHECK (category IN (
    'pothole', 'garbage', 'streetlight', 'water_leak', 'road_damage',
    'illegal_construction', 'drainage', 'traffic', 'healthcare', 'education',
    'safety', 'other',
    -- Additional categories used by Go model
    'roads', 'water', 'sanitation', 'electricity', 'street_lights',
    'parks', 'transport', 'construction', 'water_supply', 'public_safety'
));

-- Issue upvotes (toggle-based, one per user per issue)
CREATE TABLE issue_upvotes (
    issue_id VARCHAR(20) NOT NULL REFERENCES issues(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    PRIMARY KEY (issue_id, user_id)
);
CREATE INDEX idx_issue_upvotes_user ON issue_upvotes(user_id);

-- Issue comments (threaded via parent_comment_id)
CREATE TABLE issue_comments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    issue_id VARCHAR(20) NOT NULL REFERENCES issues(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    parent_comment_id UUID REFERENCES issue_comments(id) ON DELETE CASCADE,
    likes_count INT DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_issue_comments_issue ON issue_comments(issue_id, created_at ASC);
CREATE INDEX idx_issue_comments_user ON issue_comments(user_id);
CREATE INDEX idx_issue_comments_parent ON issue_comments(parent_comment_id) WHERE parent_comment_id IS NOT NULL;

-- Comment likes (toggle-based, one per user per comment)
CREATE TABLE issue_comment_likes (
    comment_id UUID NOT NULL REFERENCES issue_comments(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    PRIMARY KEY (comment_id, user_id)
);
CREATE INDEX idx_issue_comment_likes_user ON issue_comment_likes(user_id);
