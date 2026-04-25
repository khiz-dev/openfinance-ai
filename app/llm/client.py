from __future__ import annotations

import json
import logging
from dataclasses import dataclass, field
from typing import Any

from app.config import get_settings

logger = logging.getLogger(__name__)


@dataclass
class LLMResponse:
    content: str
    parsed: dict[str, Any] | None = None
    model: str = ""
    usage: dict[str, int] = field(default_factory=dict)


class LLMClient:
    """Pluggable LLM abstraction supporting OpenAI, Anthropic, and Bedrock."""

    def __init__(self) -> None:
        self.settings = get_settings()
        self.provider = self.settings.LLM_PROVIDER.lower()
        self.model = self.settings.LLM_MODEL

    def generate(
        self,
        system_prompt: str,
        user_prompt: str,
        *,
        tools: list[dict[str, Any]] | None = None,
        context: dict[str, Any] | None = None,
        temperature: float = 0.2,
        max_tokens: int = 4096,
        json_mode: bool = True,
    ) -> LLMResponse:
        if self.provider == "openai":
            return self._generate_openai(system_prompt, user_prompt, temperature, max_tokens, json_mode=json_mode)
        elif self.provider == "anthropic":
            return self._generate_anthropic(system_prompt, user_prompt, temperature, max_tokens)
        else:
            raise ValueError(f"Unsupported LLM provider: {self.provider}. Use 'openai' or 'anthropic'.")

    # ── OpenAI ────────────────────────────────────────────────────────

    @property
    def _is_reasoning_model(self) -> bool:
        return self.model.startswith(("o1", "o3", "o4"))

    def _generate_openai(
        self, system_prompt: str, user_prompt: str, temperature: float, max_tokens: int,
        *, json_mode: bool = True,
    ) -> LLMResponse:
        api_key = self.settings.OPENAI_API_KEY
        if not api_key:
            raise RuntimeError(
                "OPENAI_API_KEY is not configured. Set it in .env or environment variables. "
                "LLM-powered agents require a real API key — no mock fallback."
            )

        from openai import OpenAI

        client = OpenAI(api_key=api_key)

        role = "developer" if self._is_reasoning_model else "system"
        kwargs: dict[str, Any] = dict(
            model=self.model,
            messages=[
                {"role": role, "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
        )

        if self._is_reasoning_model:
            kwargs["max_completion_tokens"] = max_tokens
        else:
            kwargs["temperature"] = temperature
            kwargs["max_tokens"] = max_tokens

        if json_mode:
            kwargs["response_format"] = {"type": "json_object"}

        response = client.chat.completions.create(**kwargs)
        choice = response.choices[0]
        content = choice.message.content or ""
        parsed = _try_parse_json(content)
        return LLMResponse(
            content=content,
            parsed=parsed,
            model=response.model,
            usage={
                "prompt_tokens": response.usage.prompt_tokens if response.usage else 0,
                "completion_tokens": response.usage.completion_tokens if response.usage else 0,
            },
        )

    # ── Anthropic ─────────────────────────────────────────────────────

    def _generate_anthropic(
        self, system_prompt: str, user_prompt: str, temperature: float, max_tokens: int
    ) -> LLMResponse:
        api_key = self.settings.ANTHROPIC_API_KEY
        if not api_key:
            raise RuntimeError(
                "ANTHROPIC_API_KEY is not configured. Set it in .env or environment variables. "
                "LLM-powered agents require a real API key — no mock fallback."
            )

        import anthropic

        client = anthropic.Anthropic(api_key=api_key)
        response = client.messages.create(
            model=self.model,
            max_tokens=max_tokens,
            system=system_prompt,
            messages=[{"role": "user", "content": user_prompt}],
            temperature=temperature,
        )
        content = response.content[0].text if response.content else ""
        parsed = _try_parse_json(content)
        return LLMResponse(
            content=content,
            parsed=parsed,
            model=response.model,
            usage={
                "input_tokens": response.usage.input_tokens,
                "output_tokens": response.usage.output_tokens,
            },
        )


def _try_parse_json(text: str) -> dict[str, Any] | None:
    try:
        return json.loads(text)
    except (json.JSONDecodeError, TypeError):
        start = text.find("{")
        end = text.rfind("}") + 1
        if start != -1 and end > start:
            try:
                return json.loads(text[start:end])
            except json.JSONDecodeError:
                pass
    return None


def get_llm_client() -> LLMClient:
    return LLMClient()
