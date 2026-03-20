-- Rollback migration 000007
DROP TABLE IF EXISTS issue_comment_likes;
DROP TABLE IF EXISTS issue_comments;
DROP TABLE IF EXISTS issue_upvotes;

-- Restore original category CHECK constraint
ALTER TABLE issues DROP CONSTRAINT IF EXISTS issues_category_check;
ALTER TABLE issues ADD CONSTRAINT issues_category_check CHECK (category IN (
    'pothole', 'garbage', 'streetlight', 'water_leak', 'road_damage',
    'illegal_construction', 'drainage', 'traffic', 'healthcare', 'education',
    'safety', 'other'
));
