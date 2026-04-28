---
name: omh-init
description: |
  템플릿 레포를 포크한 직후 딱 1회 실행하는 부트스트랩 스킬. 플러그인 이름/마켓 abbrev/GitHub handle을
  받아 `aug6th-harness`, `omc`(마켓명), `aug6th` 자리표시자를 일괄 치환하고, 초기화 마커를
  남긴 뒤 자신을 삭제한다.
  트리거: "/omh-init", "하네스 초기화", "템플릿 초기화", "bootstrap harness", "rename template"
---

# omh-init

**1회성 부트스트랩 스킬**. 템플릿 레포(`aug6th-harness`)를 포크한 뒤 자기 플러그인으로 만들기 위한
일괄 rename을 수행한다. 실행 후 자신을 삭제(또는 남겨두기)해서 재실행을 방지한다.

> 반복 실행하며 워크스페이스별 커스텀 스킬을 추가하는 `omh-setup`과는 역할이 다르다. omh-init은
> 템플릿 포크 직후 단 한 번만 의미가 있다.

## 전제

- 현재 레포가 `aug6th-harness` 템플릿 기반인지 확인 (루트 `.claude-plugin/marketplace.json`의
  `"name": "omc"`와 `plugins[0].name: "aug6th-harness"` 존재 여부로 판정)
- 이미 초기화됐는지 마커 파일(`.{abbrev}/initialized.json`) 또는 루트에 `.omh-initialized` 존재
  여부로 확인 → 있으면 "이미 초기화된 레포입니다" 알리고 종료

## 플로우

### 1. 플러그인 이름 입력

유저에게 묻는다:

> 이 플러그인의 새 이름은 무엇으로 할까요?
> (예: `oh-my-aha-backend`, `aha-harness`)
> 권장: `oh-my-<org>-<domain>` 또는 `<org>-harness` — 템플릿 lineage가 섞이지 않게 `aug6th-harness-*` prefix는 피하세요.

유저 응답 대기. 빈 입력/공백 포함이면 재질문.

### 2. 마켓 abbrev 자동 도출 + 확인

입력받은 플러그인 이름을 하이픈 기준으로 쪼개 **각 단어 앞글자를 조합**해 후보 2~3개를 만든다.

```
예시
  oh-my-aha-backend    → omab, omabk, ohmyahab
  aha-harness          → ah, aharn, ahah
  my-backend           → mb, myb, mybk
```

유저에게 보여주고 선택/커스텀:

> abbrev 후보: omab / omabk / ohmyahab
> 이 중 고르거나 직접 입력해주세요. (기본: omab)

- 유저가 직접 입력한 값은 그대로 사용
- abbrev는 소문자 영숫자만 허용(`^[a-z][a-z0-9]{1,15}$`), 불만족 시 재질문
- `omc`와 동일하면 "템플릿 그대로입니다, 다른 걸로 하세요"

### 3. GitHub handle 자동 감지

다음 순서로 시도:

1. `gh api user -q .login` → 성공 시 handle 추출
2. 실패하면 `git config user.name` → 공백 없는 값이면 후보로
3. 둘 다 실패/빈 값이면 유저에게 직접 입력 요청

감지된 값이 있으면 반드시 **확인**받는다:

> GitHub handle을 `eun2ce`로 설정할까요? (yes/수정)

### 4. 치환 범위 프리뷰 + 승인

치환 대상:

| from | to |
|------|----|
| `aug6th-harness` | `{pluginName}` |
| `"name": "omc"` (마켓) | `"name": "{abbrev}"` |
| `aug6th` | `{handle}` |

`grep` 으로 실제 매칭 파일 전체 목록을 뽑아 유저에게 보여준다:

```bash
grep -rl "aug6th-harness\|aug6th" \
  --include="*.md" --include="*.json" --include="*.yml" \
  --include="*.yaml" --include="*.ts" \
  . \
  | grep -v node_modules | grep -v "vendor/" | grep -v ".git/"
```

마켓명 `"name": "omc"`는 별도로 정확 매칭:

```bash
grep -rn '"name": "omc"' .claude-plugin/marketplace.json
```

프리뷰 표시 후:

> 위 N개 파일에서 치환합니다. 진행할까요? (yes/no/제외할 파일 지정)

**vendor, node_modules, .git, 이 SKILL.md 자신은 반드시 제외**.

### 5. 치환 + 마커 생성

유저 승인 후:

1. 각 대상 파일에 대해 `sed -i '' 's/aug6th-harness/{pluginName}/g'` (macOS 기준)
   - Linux면 `sed -i 's/.../.../g'`, 플랫폼 판정은 `uname` 으로
2. `.claude-plugin/marketplace.json`만 추가로 `"name": "omc"` → `"name": "{abbrev}"` 정확 치환
   - `harness/.claude-plugin/plugin.json`에 `"marketplace": "omc"` 참조 있으면 그것도
3. `aug6th` → `{handle}` 일괄 치환
4. 완료 마커 생성:
   ```bash
   mkdir -p .{abbrev}
   cat > .{abbrev}/initialized.json <<EOF
   {
     "initializedAt": "<ISO-8601 now>",
     "pluginName": "{pluginName}",
     "abbrev": "{abbrev}",
     "handle": "{handle}",
     "omhInitVersion": "1"
   }
   EOF
   ```
5. `.gitignore`에 `.{abbrev}/` 추가 (이미 있으면 skip)

### 6. omh-init 셀프 삭제 확인

유저에게 묻는다:

> 초기화가 끝났습니다. omh-init 스킬을 삭제할까요?
> (yes: `harness/skills/omh-init/` 디렉토리 삭제 / no: 남겨둠 — 재실행은 마커로 차단)

- `yes` → `rm -rf harness/skills/omh-init`
- `no` → 그대로 두고, 대신 `.omh-initialized` 플래그 루트에 생성해서 재실행 가드

### 7. 완료 안내

```
✅ 초기화 완료
  - 플러그인: {pluginName}
  - 마켓: {abbrev}
  - handle: {handle}

다음 단계:
  1. git diff 로 치환 결과 확인
  2. 원하면 추가 에이전트/스킬 커스터마이징
  3. /omh-setup 으로 워크스페이스별 커스텀 스킬 추가 시작
  4. git add -A && git commit -m "chore: bootstrap {pluginName} from aug6th-harness template"
```

## 원칙

- **재실행 방지** — 마커 또는 셀프 삭제로 2회차 차단
- **승인 필수** — 3개 핵심 단계(abbrev 후보, handle 확인, 치환 프리뷰) 모두 유저 OK 받고 진행
- **vendor 불변** — `harness/vendor/**` 아래는 절대 치환 대상 아님
- **atomic 실패** — 중간 실패 시 이미 친 치환은 롤백 불가. 유저에게 "git stash / git checkout ." 안내
- **타겟 범위 명시** — 치환 파일 목록을 유저 눈으로 볼 수 있게 항상 출력

## 안 하는 것

- `aug6th-harness-*` prefix 확장 지원 (템플릿 lineage 혼란 원인, 비추)
- abbrev prefix strip 같은 복잡한 규칙
- `harness/vendor/` 수정
- `git commit` 자동 실행 (유저가 diff 확인 후 직접)
- 원격 push
