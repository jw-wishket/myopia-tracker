# 소셜 로그인 (Google / 카카오톡) 추가 가이드

## 개요

Supabase Auth가 Google과 Kakao OAuth를 모두 지원하므로, 프론트엔드 코드 변경은 최소화하면서 소셜 로그인을 추가할 수 있습니다.

---

## 1. Google 로그인

### 1-1. Google Cloud Console 설정

1. https://console.cloud.google.com 접속
2. 프로젝트 선택 (없으면 새로 생성)
3. **API 및 서비스 → 사용자 인증 정보** 이동
4. **OAuth 2.0 클라이언트 ID** 생성:
   - 애플리케이션 유형: **웹 애플리케이션**
   - 이름: `Myopia Tracker`
   - 승인된 리디렉션 URI 추가:
     ```
     https://rwqggjbozibuyajdluqn.supabase.co/auth/v1/callback
     ```
5. 생성 후 **클라이언트 ID**와 **클라이언트 보안 비밀번호** 복사

### 1-2. Supabase 설정

1. Supabase 대시보드 → **Authentication → Providers**
2. **Google** 활성화
3. 입력:
   - Client ID: Google에서 복사한 클라이언트 ID
   - Client Secret: Google에서 복사한 보안 비밀번호
4. **Save**

### 1-3. 프론트엔드 코드 추가

**src/data/dataService.js** 에 함수 추가:
```js
export async function loginWithGoogle() {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: window.location.origin + '/#login'
    }
  });
  if (error) throw error;
  return data;
}
```

**src/screens/loginScreen.js** 로그인 탭에 버튼 추가:
```html
<button id="googleLoginBtn" class="w-full py-2.5 border border-slate-200 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors flex items-center justify-center gap-2">
  <svg class="w-4 h-4" viewBox="0 0 24 24">
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/>
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
  </svg>
  Google로 계속하기
</button>
```

이벤트 핸들러 추가:
```js
container.querySelector('#googleLoginBtn').addEventListener('click', async () => {
  try {
    await loginWithGoogle();
    // OAuth 리다이렉트 후 자동으로 돌아옴
  } catch (err) {
    console.error('Google login failed:', err);
  }
});
```

### 1-4. OAuth 리다이렉트 처리

Google 로그인 후 사용자가 앱으로 돌아올 때, Supabase가 자동으로 세션을 생성합니다.
`src/main.js`의 세션 복원 코드가 이미 이를 처리합니다:

```js
(async () => {
  const user = await getCurrentUser();
  if (user) {
    setState({ currentUser: user });
    // 역할별 라우팅...
  }
  startRouter(document.getElementById('app'));
})();
```

### 1-5. 신규 Google 사용자 프로필 처리

Google로 처음 로그인하면 `auth.users`에 사용자가 생성되고,
DB 트리거 `handle_new_user()`가 자동으로 `profiles` 테이블에 기본 프로필을 생성합니다.

하지만 역할(role)이 기본값 'customer'로 설정되므로,
의사로 가입하려면 추가 단계가 필요합니다:

**방법 A: 소셜 로그인 후 역할 선택 화면**
- Google 로그인 → 프로필에 role이 없으면 → 역할 선택 화면으로 이동
- 역할 선택 후 profiles 테이블 업데이트

**방법 B: 회원가입 시에만 소셜 로그인 사용**
- 회원가입 위저드 Step 1에서 Google 버튼 표시
- Google 인증 후 나머지 단계(역할, 안과 선택) 진행

---

## 2. 카카오톡 로그인

### 2-1. 카카오 개발자 설정

1. https://developers.kakao.com 접속
2. **내 애플리케이션 → 애플리케이션 추가하기**
3. 앱 이름: `근시관리 트래커`
4. 생성 후 **앱 키** 페이지에서:
   - **REST API 키** 복사 (Client ID로 사용)

5. **카카오 로그인 → 활성화 설정** → ON
6. **카카오 로그인 → Redirect URI** 추가:
   ```
   https://rwqggjbozibuyajdluqn.supabase.co/auth/v1/callback
   ```

7. **카카오 로그인 → 동의항목** 설정:
   - 닉네임: 필수 동의
   - 이메일: 필수 동의 (비즈 앱 전환 필요)
   - 프로필 사진: 선택 동의

8. **앱 키 → 보안 → Client Secret** 생성 및 복사

### 2-2. 비즈 앱 전환 (이메일 수집 필수)

카카오에서 이메일 정보를 받으려면 **비즈 앱 전환**이 필요합니다:
1. **내 애플리케이션 → 앱 설정 → 비즈니스**
2. **비즈 앱으로 전환** 클릭
3. 사업자 정보 입력 (개인 개발자도 가능)

> **참고:** 이메일 미수집 시 Supabase에서 사용자 식별이 어려울 수 있습니다.
> 비즈 앱 전환이 어렵다면, 카카오 로그인 후 이메일을 별도로 입력받는 방법도 있습니다.

### 2-3. Supabase 설정

1. Supabase 대시보드 → **Authentication → Providers**
2. **Kakao** 활성화
3. 입력:
   - Client ID: 카카오 REST API 키
   - Client Secret: 카카오에서 생성한 Client Secret
4. **Save**

### 2-4. 프론트엔드 코드 추가

**src/data/dataService.js** 에 함수 추가:
```js
export async function loginWithKakao() {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'kakao',
    options: {
      redirectTo: window.location.origin + '/#login'
    }
  });
  if (error) throw error;
  return data;
}
```

**src/screens/loginScreen.js** 로그인 탭에 버튼 추가:
```html
<button id="kakaoLoginBtn" class="w-full py-2.5 rounded-xl text-sm font-medium transition-colors flex items-center justify-center gap-2" style="background:#FEE500; color:#191919;">
  <svg class="w-4 h-4" viewBox="0 0 24 24" fill="#191919">
    <path d="M12 3C6.48 3 2 6.36 2 10.5c0 2.67 1.74 5.01 4.36 6.36-.14.49-.89 3.15-.92 3.36 0 0-.02.15.07.21.1.06.21.01.21.01.27-.04 3.16-2.08 3.66-2.44.84.12 1.72.18 2.62.18 5.52 0 10-3.36 10-7.5S17.52 3 12 3z"/>
  </svg>
  카카오로 계속하기
</button>
```

이벤트 핸들러 추가:
```js
container.querySelector('#kakaoLoginBtn').addEventListener('click', async () => {
  try {
    await loginWithKakao();
  } catch (err) {
    console.error('Kakao login failed:', err);
  }
});
```

### 2-5. 카카오 사용자 프로필 매핑

카카오 로그인 시 Supabase가 받는 사용자 정보:
```json
{
  "id": "카카오 고유 ID",
  "email": "user@kakao.com",  // 비즈앱일 때만
  "user_metadata": {
    "name": "카카오 닉네임",
    "avatar_url": "프로필 사진 URL",
    "provider_id": "카카오 ID"
  }
}
```

DB 트리거 `handle_new_user()`가 자동으로 처리하지만,
카카오는 `name`이 `user_metadata.name`이 아닌 `user_metadata.full_name`에 있을 수 있으므로
트리거를 업데이트해야 할 수 있습니다:

```sql
-- 기존 트리거 업데이트
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, email, name, role)
  values (
    new.id,
    new.email,
    coalesce(
      new.raw_user_meta_data ->> 'name',
      new.raw_user_meta_data ->> 'full_name',
      new.raw_user_meta_data ->> 'user_name',
      split_part(new.email, '@', 1)
    ),
    coalesce(new.raw_user_meta_data ->> 'role', 'customer')
  );
  return new;
end;
$$;
```

---

## 3. 공통 고려사항

### 3-1. 로그인 버튼 배치

로그인 탭에 소셜 버튼을 추가하는 추천 레이아웃:

```
┌─────────────────────────┐
│  이메일 입력             │
│  비밀번호 입력           │
│  [로그인] 버튼           │
│                         │
│  ────── 또는 ──────     │
│                         │
│  [Google로 계속하기]     │
│  [카카오로 계속하기]     │
└─────────────────────────┘
```

### 3-2. 소셜 로그인 후 역할 분기

소셜 로그인으로 처음 가입한 사용자는 역할이 'customer' 기본값입니다.
추가 정보 입력이 필요한 경우:

```
소셜 로그인 완료
  ↓
getCurrentUser() → profile 조회
  ↓
profile.clinicId가 없으면?
  → 추가 정보 입력 화면으로 이동 (#onboarding)
  → 역할 선택 + 안과 선택 + (자녀 등록)
  → profiles 테이블 업데이트
  ↓
정상 라우팅 (doctor/customer/admin)
```

### 3-3. 소셜 계정 연결 (기존 이메일 계정과)

같은 이메일로 이메일 가입 + Google 가입을 하면 충돌이 발생할 수 있습니다.
Supabase 설정에서 처리 방식 선택:

- **Authentication → General → User Signups**
  - "Automatically link accounts with the same email" 활성화 추천

### 3-4. 환경변수 (Vercel)

소셜 로그인 자체에는 추가 환경변수가 필요하지 않습니다.
OAuth 키는 Supabase 대시보드에서 관리하고,
프론트엔드는 `supabase.auth.signInWithOAuth()`만 호출하면 됩니다.

### 3-5. 작업 순서 요약

| 단계 | Google | 카카오 |
|------|--------|--------|
| 1 | Google Cloud Console에서 OAuth 클라이언트 생성 | 카카오 개발자에서 앱 생성 |
| 2 | Supabase에 Client ID/Secret 입력 | 비즈 앱 전환 (이메일 수집) |
| 3 | Supabase에 Client ID/Secret 입력 | Supabase에 REST API 키/Secret 입력 |
| 4 | 프론트엔드 버튼 + 함수 추가 | 프론트엔드 버튼 + 함수 추가 |
| 5 | 테스트 | handle_new_user 트리거 업데이트 |
| 6 | - | 테스트 |

### 3-6. 예상 소요 시간

| 항목 | 시간 |
|------|------|
| Google 설정 (Console + Supabase) | 15분 |
| 카카오 설정 (개발자 + 비즈앱 + Supabase) | 30분 |
| 프론트엔드 코드 추가 | 15분 |
| 신규 사용자 온보딩 플로우 | 1~2시간 |
| 테스트 및 디버깅 | 30분 |
| **합계** | **약 2~3시간** |
