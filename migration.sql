-- 1. 분류 그룹(카테고리) 설정을 위한 테이블 생성
CREATE TABLE IF NOT EXISTS code_groups (
    name VARCHAR(255) PRIMARY KEY,
    is_multi_select BOOLEAN DEFAULT TRUE NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 2. 기존 분류 그룹(프로젝트 및 기본 태그) 기본값 인서트
-- 프로젝트는 단일 선택(is_multi_select = false)이며, tag는 다중 선택(is_multi_select = true)입니다.
INSERT INTO code_groups (name, is_multi_select) 
VALUES 
  ('프로젝트', FALSE), 
  ('tag', TRUE) 
ON CONFLICT (name) DO UPDATE 
SET is_multi_select = EXCLUDED.is_multi_select;

-- 3. codes 테이블에 user_id 추가 및 외래키 연동
-- group_name 컬럼이 code_groups.name을 연동 참조하도록 연동합니다.
ALTER TABLE codes ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT NULL;

-- 4. notes 테이블에 user_id 추가
ALTER TABLE notes ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT NULL;

-- 5. RLS (Row Level Security) 설정 및 보안 정책 적용
-- 사용자별 격리 공간을 활성화합니다.
ALTER TABLE notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE code_groups ENABLE ROW LEVEL SECURITY;

-- 5-1. notes 테이블 보안 정책
DROP POLICY IF EXISTS "Users can manage their own notes" ON notes;
CREATE POLICY "Users can manage their own notes" ON notes
    FOR ALL
    TO authenticated
    USING (auth.uid() = user_id OR user_id IS NULL)
    WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

-- 5-2. codes 테이블 보안 정책
DROP POLICY IF EXISTS "Users can manage their own codes" ON codes;
CREATE POLICY "Users can manage their own codes" ON codes
    FOR ALL
    TO authenticated
    USING (auth.uid() = user_id OR user_id IS NULL)
    WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

-- 5-3. code_groups 테이블 보안 정책
DROP POLICY IF EXISTS "Users can manage their own code_groups" ON code_groups;
CREATE POLICY "Users can manage their own code_groups" ON code_groups
    FOR ALL
    TO authenticated
    USING (auth.uid() = user_id OR user_id IS NULL)
    WITH CHECK (auth.uid() = user_id OR user_id IS NULL);
