# Quality Dashboard 배포 가이드 (Supabase + Vercel)

이 가이드는 **Supabase** (데이터베이스/백엔드)와 **Vercel** (프론트엔드 호스팅)을 사용하여 프로젝트를 무료로 배포하는 방법을 설명합니다.

## 1. Supabase 프로젝트 생성 (데이터베이스)

1.  [Supabase](https://supabase.com/)에 접속하여 회원가입/로그인합니다.
2.  **"New Project"** 버튼을 클릭합니다.
3.  Organization을 선택하고, 프로젝트 정보를 입력합니다:
    -   **Name**: `quality-dashboard` (원하는 이름)
    -   **Database Password**: 강력한 비밀번호를 설정하고 **꼭 기억해두세요**.
    -   **Region**: `Korea, Seoul` (가까운 리전 선택)
4.  **"Create new project"**를 클릭하고 프로젝트가 생성될 때까지 기다립니다 (약 1~2분 소요).

## 2. API 키 확인

1.  프로젝트 대시보드에서 왼쪽 메뉴의 **Project Settings** (톱니바퀴 아이콘) -> **API**를 클릭합니다.
2.  `Project URL`과 `Project API keys` (anon, public)을 확인합니다.
    -   `URL`: `https://your-project-id.supabase.co` 형태
    -   `anon key`: `eyJ...` 로 시작하는 긴 문자열
3.  이 값들을 복사해 둡니다.

## 3. Vercel 배포 (프론트엔드)

이미 Vercel에 프로젝트가 있다면 **Settings**에서 환경 변수만 추가하면 됩니다.

1.  [Vercel 대시보드](https://vercel.com/dashboard)로 이동하여 해당 프로젝트를 선택합니다.
2.  상단 탭의 **Settings** -> **Environment Variables** 메뉴로 이동합니다.
3.  다음 두 개의 변수를 추가합니다:
    -   **Key**: `VITE_SUPABASE_URL`
    -   **Value**: (아까 복사한 Supabase Project URL)
    -   **Key**: `VITE_SUPABASE_ANON_KEY`
    -   **Value**: (아까 복사한 Supabase anon key)
4.  **Save**를 클릭하여 저장합니다.
5.  **Deployments** 탭으로 이동하여 최신 배포의 **Redeploy** 버튼을 누르거나, 코드를 GitHub에 푸시하여 새 배포를 트리거합니다.

## 4. 로컬 개발 환경 설정 (선택 사항)

로컬에서 실행하려면 프로젝트 루트에 `.env` 파일을 만들고 다음 내용을 추가하세요:

```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

(`.env.example` 파일을 복사해서 `.env`로 이름을 바꾸고 값을 채워넣으면 됩니다.)

## 5. 데이터베이스 테이블 생성 (예시)

Supabase 대시보드의 **Table Editor**에서 새 테이블을 만들 수 있습니다.

예를 들어 `status` 데이터를 저장할 테이블을 만든다면:
1.  **Create a new table** 클릭.
2.  Name: `statuses`
3.  Columns 추가:
    -   `id`: int8, Primary Key
    -   `title`: text
    -   `count`: int8
    -   `created_at`: timestamptz, default: `now()`
4.  **Save** 클릭.

이제 코드에서 `supabase.from('statuses').select('*')`와 같이 데이터를 가져올 수 있습니다.
