---
name: omh-setup
description: |
  워크스페이스(로컬 디렉토리 또는 GitHub 레포)를 받아서 그 레포 성격에 맞는 하네스 구성을 판단하고
  이 플러그인의 skills/ 아래에 맞춤 커스텀 스킬을 추가하는 메타 스킬.
  트리거: "/omh-setup", "하네스 구성해줘", "harness setup", "workspace 하네스", "레포 하네스 구성"
---

# omh-setup

워크스페이스에 맞는 하네스 구성을 이 플러그인 안에 축적합니다. 타겟 워크스페이스는 건드리지 않고,
이 레포(`harness/skills/`) 아래에 관련 커스텀 스킬을 생성/업데이트하는 것이 목표입니다.

## 입력

다음 둘 중 하나를 유저가 제공:

- **로컬**: `@~/works/my-backend` 같은 Claude Code 파일 참조
- **원격**: `https://github.com/org/repo` GitHub URL

둘 다 선택 가능하다고 유저에게 명시해서 물어봅니다.

## 플로우

### 1. 입력 수집

유저에게 묻습니다:

> 하네스를 구성할 대상 워크스페이스를 알려주세요.
> - 로컬 디렉토리: `@경로` 로 드롭
> - GitHub 레포: `https://github.com/owner/repo` URL

### 2. 얕은 분석 (전수 조사 금지)

타겟을 얕게 훑어 **패턴**만 판정합니다.

로컬(`@path`) 입력 시:
- `Read` 툴로 루트의 README / `package.json` / `pyproject.toml` / `go.mod` / `Cargo.toml` 만 확인
- `Glob` 으로 최상위 디렉토리 구조만 확인 (`*/` 한 레벨)
- 얕게 본 것만으로도 대부분 판정 가능. 부족할 때만 추가 조회 요청

GitHub URL 입력 시:
- `gh repo view owner/repo` 로 기본 메타
- `gh api /repos/owner/repo/contents` 로 루트 파일 목록
- `gh api /repos/owner/repo/contents/README.md` 등 핵심 파일만 `content` 추출해 디코딩
- 전체 clone 은 **하지 않음**. 필요하면 유저에게 `gh repo clone --depth 1` 승인을 요청

### 3. 패턴 판정

판정 기준(예시, 확장 가능):

| 신호 | 제안 패턴 | 추가할 스킬/에이전트 |
|------|-----------|----------------------|
| `fastapi` / `uvicorn` 의존성 | fastapi-backend | `fastapi-debug`, `fastapi-expert` 에이전트 |
| `dagster` 의존성 또는 `dagster.yaml` | dagster-pipeline | `dagster-debug`, `dagster-expert` 에이전트 |
| `kubernetes/`, `k8s/`, `helm/` 디렉토리 | k8s-ops | `k8s-deploy`, `k8s-operator` 에이전트 |
| `.github/workflows/` 다수 | ci-debug | `ci-debug` 스킬 |
| `terraform/` 또는 `*.tf` | terraform-ops | `infra-audit`, `terraform-expert` |
| `Cargo.toml` | rust | `rust-expert` |

여러 신호가 겹치면 복합 패턴으로 제안합니다.

### 4. 제안 제시 + 승인

판정 결과를 표로 유저에게 보여주고 OK/수정 받습니다:

```
대상: ~/works/my-backend
감지된 패턴: fastapi-backend + ci-debug
추가할 것:
  - skills/fastapi-debug/SKILL.md (신규)
  - skills/ci-debug/SKILL.md (신규)
  - agents/fastapi-expert.md (신규)

진행할까요? (yes / skills만 / agents만 / 수정)
```

### 5. 파일 생성

유저 승인 후 이 플러그인의 `harness/skills/{pattern}/SKILL.md` 및/또는
`harness/agents/{role}.md` 를 `Write` 툴로 생성합니다.

- 흔한 패턴(fastapi, dagster, k8s 등)은 **템플릿 기반**으로 빠르게
- 새 패턴이면 **유저 확인 받아 직접 작성**

### 6. 결과 요약

- 생성된 파일 경로 나열
- 타겟 워크스페이스에서 쓰려면 "이 플러그인을 `claude plugins install` 로 설치하세요" 가이드
- 타겟 워크스페이스 자체는 **수정하지 않음**

## 원칙

- **전수 분석 금지** — 얕게 훑어 패턴 판정, 필요할 때만 심화
- **타겟 불변** — 생성물은 이 레포에만 쌓임
- **재사용 우선** — 이미 `skills/fastapi-debug` 있으면 신규 생성 대신 재사용 안내
- **승인 없이 파일 쓰지 않음** — 반드시 4단계 승인 후 5단계 진행

## 안 하는 것

- 타겟 워크스페이스에 파일 쓰기
- 타겟 레포 fork/clone (얕은 메타 조회만)
- vendor 스킬 수정 (심볼릭 링크는 읽기 전용)
