#!/usr/bin/env node
/**
 * PreToolUse:Agent 훅 — model-routing.json 기반 동적 모델 선택
 *
 * stdin으로 Agent tool_input을 받아서 model 파라미터가 없으면
 * model-routing.json에서 해당 에이전트의 default 모델을 주입한다.
 */
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const CONFIG_PATH = resolve(__dirname, "../../config/model-routing.json");

let input = "";
process.stdin.setEncoding("utf8");
process.stdin.on("data", (chunk) => (input += chunk));
process.stdin.on("end", () => {
  try {
    const data = JSON.parse(input);
    const toolInput = data.tool_input || {};

    // model이 지정되어 있어도 range 검증은 수행

    // subagent_type에서 에이전트 이름 추출
    // "omc-harness:executor" → "executor"
    // "oh-my-claudecode:executor" → "executor"
    // "executor" → "executor"
    const subagentType = toolInput.subagent_type || "";
    const agentName = subagentType.includes(":")
      ? subagentType.split(":").pop()
      : subagentType;

    if (!agentName) {
      process.exit(0);
    }

    // model-routing.json 로드
    let routing;
    try {
      routing = JSON.parse(readFileSync(CONFIG_PATH, "utf8"));
    } catch {
      process.exit(0);
    }

    const agentConfig = routing.agents?.[agentName];
    if (!agentConfig) {
      process.exit(0);
    }

    // 모델 결정: 지정된 모델이 range 안이면 유지, 밖이면 보정
    const requested = toolInput.model;
    let selected;

    if (requested && agentConfig.range.includes(requested)) {
      selected = requested;
    } else if (requested && !agentConfig.range.includes(requested)) {
      // range 밖이면 min으로 보정
      selected = agentConfig.min;
    } else {
      selected = agentConfig.default;
    }

    // codex 선택 시 subagent_type을 codex:codex-rescue로 변경
    const updatedInput = { ...toolInput };
    if (selected === "codex") {
      updatedInput.subagent_type = "codex:codex-rescue";
      delete updatedInput.model;
    } else {
      updatedInput.model = selected;
    }
    const action = requested
      ? requested === selected
        ? "유지"
        : `보정 ${requested}→${selected}`
      : "기본값";

    console.log(
      JSON.stringify({
        hookSpecificOutput: {
          hookEventName: "PreToolUse",
          updatedInput,
          additionalContext: `[Model Router] ${agentName} → ${selected} (${action}, range: ${agentConfig.range.join("~")})`,
        },
      })
    );
  } catch {
    process.exit(0);
  }
});
