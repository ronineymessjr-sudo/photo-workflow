from __future__ import annotations

from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field, SecretStr, model_validator

RankMode = Literal["shadow", "soft", "primary"]
UserMode = Literal["mass", "enthusiast", "pro"]


class CandidateScores(BaseModel):
    model_config = ConfigDict(extra="forbid")

    visual_score: float | None = None
    policy_score: float | None = None
    reproducibility_score: float | None = None
    final_composite_score: float | None = None


class CandidateFeatures(BaseModel):
    model_config = ConfigDict(extra="allow")

    focal_length_mm: float | None = Field(default=None, ge=8, le=1200)
    aperture: float | None = Field(default=None, ge=0.7, le=64)
    shot_type: str | None = None
    composition_type: str | None = None
    camera_angle: str | None = None
    pose_family: str | None = None
    lighting_style: str | None = None
    style_family: str | None = None
    scene_depth_layers: int | None = Field(default=None, ge=1, le=8)
    subject_frame_ratio: float | None = Field(default=None, ge=0, le=1)
    negative_space_ratio: float | None = Field(default=None, ge=0, le=1)
    foreground_occlusion_ratio: float | None = Field(default=None, ge=0, le=1)
    experimental_level: float | None = Field(default=None, ge=0, le=1)
    identity_consistency_score: float | None = Field(default=None, ge=0, le=1)
    render_quality_score: float | None = Field(default=None, ge=0, le=1)


class RankCandidate(BaseModel):
    model_config = ConfigDict(extra="allow")

    candidate_id: str = Field(min_length=1)
    ranking_position: int | None = Field(default=None, ge=1)
    scores: CandidateScores = Field(default_factory=CandidateScores)
    features: CandidateFeatures = Field(default_factory=CandidateFeatures)


class RankRequest(BaseModel):
    model_config = ConfigDict(extra="allow")

    request_id: str = Field(min_length=1)
    user_id: str | None = None
    experiment_id: str | None = None
    mode: UserMode | None = None
    scene_type: str | None = None
    available_lenses: list[str] = Field(default_factory=list)
    output_count: int | None = Field(default=None, ge=1)
    rank_mode: RankMode | None = None
    model_weight: float | None = Field(default=None, ge=0, le=1)
    model_version: str | None = None
    candidates: list[RankCandidate] = Field(min_length=2)

    @model_validator(mode="after")
    def validate_candidates(self) -> "RankRequest":
        ids = [item.candidate_id for item in self.candidates]
        if len(ids) != len(set(ids)):
            raise ValueError("candidate_id values must be unique within a request")
        positions = [item.ranking_position for item in self.candidates if item.ranking_position is not None]
        if len(positions) != len(set(positions)):
            raise ValueError("ranking_position values must be unique when provided")
        return self


class ShootPlanRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    request_id: str = Field(min_length=1)
    brief: str = Field(min_length=1, max_length=2000)
    style_direction: str | None = Field(default=None, max_length=80)
    output_count: int = Field(default=3, ge=1, le=16)
    available_lenses: list[str] = Field(default_factory=list, max_length=12)


class ShootGenerationConditionRequest(ShootPlanRequest):
    reference_asset_ids: list[str] = Field(default_factory=list, max_length=12)
    generator: Literal["local-diffusion", "external-image-service", "prompt-only"] = "prompt-only"
    seed: int | None = Field(default=None, ge=0, le=2**32 - 1)


class ShootLocalGenerationRequest(ShootGenerationConditionRequest):
    # Keep the legacy LoRA route available for compatibility while exposing a
    # research-backed composite route that can be enabled without downloading
    # another multi-GB checkpoint.
    generation_method: Literal["legacy-lora", "research-composite-v049"] = "legacy-lora"
    base_model: Literal["realistic-vision-v60-b1-sd15", "dreamshaper-8"] = "realistic-vision-v60-b1-sd15"
    steps: int = Field(default=28, ge=1, le=50)
    width: int = Field(default=512, ge=256, le=1024, multiple_of=8)
    height: int = Field(default=768, ge=256, le=1024, multiple_of=8)
    # Research/prompt-first turns can render a small seed batch and let the
    # local composition gate choose the most stable frame.  The default keeps
    # the API backward-compatible; the web UI opts into three candidates.
    candidate_count: int = Field(default=1, ge=1, le=4)
    shot_index: int = Field(default=0, ge=0, le=15)
    lora_adapter: Literal["none", "photoatelier-private-v1", "photoatelier-realistic-r4-250", "photoatelier-realistic-r8-400", "photoatelier-realistic-r8-600", "photoatelier-portrait-r4-300", "photoatelier-face-anatomy-r2-180", "photoatelier-composite-r4-900", "photoatelier-realism-v038-900", "photoatelier-local-v047-900", "photoatelier-framing-v048-420", "photoatelier-semantic-v049-240", "photoatelier-realism-v050-300", "photoatelier-composition-v051-320", "photoatelier-spatial-v061-180", "photoatelier-hf-realism-semantic-v063-180", "photoatelier-hf-clean-prompt-v064-180", "photoatelier-hf-clean-prompt-v065-360", "photoatelier-hf-clean-prompt-v066-540", "photoatelier-hf-clean-prompt-v067-720", "photoatelier-hf-clean-prompt-v068-900"] = "none"
    lora_scale: float = Field(default=0.25, ge=0, le=2)
    controlnet_conditioning: Literal["none", "canny", "softedge", "depth"] = "none"
    control_image_path: str | None = Field(default=None, max_length=500)
    control_image_preprocessed: bool = False
    controlnet_scale: float = Field(default=0.8, ge=0, le=2)
    ip_adapter_conditioning: Literal["none", "ip-adapter-sd15"] = "none"
    ip_adapter_image_path: str | None = Field(default=None, max_length=500)
    ip_adapter_scale: float = Field(default=0.6, ge=0, le=1)
    # Opt-in only: human-heavy moodboards can distort faces when injected into
    # an SD1.5 checkpoint, so the research route keeps prompt-first generation
    # unless the caller explicitly requests this reference condition.
    use_moodboard_reference: bool = False
    # Opt-in synthetic identity lock. The bundled reference is a local
    # generated face crop; it carries no real-person identity claim.
    use_fixed_synthetic_face: bool = False
    # The current six local control images failed aesthetic review. Keep this
    # experimental path opt-in until replacement controls pass a human gate.
    auto_viewpoint_control: bool = False
    v033_visual_route: Literal[
        "none",
        "auto",
        "rain-high-angle-crossing",
        "golden-ground-motion",
        "overhead-field-archive",
        "candle-film-loading-detail",
    ] = "none"


class ShootExternalGenerationRequest(ShootGenerationConditionRequest):
    """Production-oriented remote image generation request.

    The provider credential is intentionally not accepted in the request body;
    it must live in the server environment.  ``dry_run`` is safe to use before
    a provider token is configured and returns the compiled request only.
    """

    provider: Literal["huggingface", "pollinations"] = "huggingface"
    # Start with the faster Apache-licensed Schnell checkpoint. The image
    # client accepts a plain Hub repo id (unlike the chat-only ``:cheapest``
    # policy suffix), so cost is controlled here by the low-step/single-
    # candidate profile and the selected provider route.
    model: str = Field(default="black-forest-labs/FLUX.1-schnell", min_length=1, max_length=200)
    provider_route: str | None = Field(default=None, max_length=80)
    # Optional local anchor for identity/environment consistency.  The file
    # is validated against the repository root before any provider call; no
    # remote URL or credential is accepted here.
    reference_image_path: str | None = Field(default=None, max_length=500)
    # Optional composition-friendly canvas. Explicit width/height remain
    # backward compatible; this field is useful to prevent every web request
    # from becoming the old portrait default.
    aspect_ratio: Literal["landscape", "landscape-wide", "square", "portrait", "portrait-tall"] | None = None
    steps: int = Field(default=4, ge=1, le=80)
    width: int = Field(default=768, ge=256, le=1536, multiple_of=8)
    height: int = Field(default=1024, ge=256, le=1536, multiple_of=8)
    guidance_scale: float | None = Field(default=None, ge=0, le=30)
    candidate_count: int = Field(default=1, ge=1, le=4)
    shot_index: int = Field(default=0, ge=0, le=15)
    # The browser may pass the exact shot contract selected from the already
    # generated plan.  Keeping it explicit prevents a second planner pass from
    # silently replacing the user's selected shot language.
    shot_contract: dict[str, Any] | None = None
    judge_mode: Literal["heuristic", "heuristic-plus-vlm"] = "heuristic"
    billing_mode: Literal["free-credit-first", "paid-approved"] = "free-credit-first"
    dry_run: bool = False


class RemoteProviderConfigRequest(BaseModel):
    """Loopback-only runtime configuration; the token is OS-store persisted."""

    model_config = ConfigDict(extra="forbid")

    token: SecretStr = Field(min_length=1, max_length=500)


class ShootComfyUIWorkflowRequest(ShootPlanRequest):
    """Request a local ComfyUI blueprint without submitting or downloading."""

    model_variant: Literal["z-image-turbo"] = "z-image-turbo"
    steps: int = Field(default=9, ge=1, le=50)
    width: int = Field(default=1024, ge=256, le=2048, multiple_of=8)
    height: int = Field(default=1024, ge=256, le=2048, multiple_of=8)
    seed: int | None = Field(default=None, ge=0, le=2**32 - 1)
    negative_prompt: str | None = Field(default=None, max_length=4000)


class ShootIdentityLockWorkflowRequest(ShootPlanRequest):
    """Build an identity-locked generation workflow without executing it."""

    identity_method: Literal["pulid-flux", "instantid", "photomaker-v2", "ip-adapter-faceid", "fixed-asset-edit"] = "pulid-flux"
    execution_backend: Literal["external-provider", "comfyui-local", "comfyui-cloud"] = "external-provider"
    reference_image_path: str | None = Field(default=None, max_length=500)
    scene_anchor_path: str | None = Field(default=None, max_length=500)
    pose_control: Literal["none", "openpose", "depth", "canny"] = "openpose"
    visible_face_expected: bool = True
    aspect_ratio: Literal["landscape", "landscape-wide", "square", "portrait", "portrait-tall"] = "landscape"
    width: int = Field(default=1024, ge=256, le=1536, multiple_of=8)
    height: int = Field(default=768, ge=256, le=1536, multiple_of=8)
    candidate_count: int = Field(default=2, ge=1, le=4)
    max_retries: int = Field(default=2, ge=0, le=3)
    seed: int | None = Field(default=None, ge=0, le=2**32 - 1)
    negative_prompt: str | None = Field(default=None, max_length=4000)


class BatchRankRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    requests: list[RankRequest] = Field(min_length=1)


class FeedbackEvent(BaseModel):
    model_config = ConfigDict(extra="forbid")

    event_id: str = Field(min_length=1)
    timestamp: datetime
    session_id: str = Field(min_length=1)
    request_id: str = Field(min_length=1)
    user_id: str | None = None
    candidate_id: str = Field(min_length=1)
    event_type: Literal[
        "request_created",
        "candidate_rendered",
        "candidate_viewed",
        "candidate_saved",
        "candidate_shared",
        "candidate_regenerated",
        "candidate_selected_final",
        "candidate_dismissed",
        "shot_executed",
        "shot_skipped",
        "shot_recreated",
        "real_shoot_uploaded",
        "user_rating_submitted",
    ]
    mode: UserMode | None = None
    theme: str | None = None
    scene_type: str | None = None
    available_lenses: list[str] | None = None
    output_count: int | None = Field(default=None, ge=1)
    ranking_position: int | None = Field(default=None, ge=1)
    visual_score: float | None = None
    policy_score: float | None = None
    reproducibility_score: float | None = None
    final_composite_score: float | None = None
    rating: float | None = Field(default=None, ge=0, le=10)
    candidate_features: CandidateFeatures | None = None
    consent_version: str | None = Field(default=None, max_length=100)
    data_use_scope: Literal["product", "training", "product_and_training"] | None = None
    meta: dict[str, Any] | None = None


class FeedbackBatch(BaseModel):
    model_config = ConfigDict(extra="forbid")

    events: list[FeedbackEvent] = Field(min_length=1, max_length=1000)


class ActivateModelRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    reason: str = Field(default="manual activation", min_length=1, max_length=500)


class RollbackModelRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    reason: str = Field(default="manual rollback", min_length=1, max_length=500)


class RegisterModelRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    path: str = Field(min_length=1)
    sha256: str | None = Field(default=None, min_length=64, max_length=64)
    stage: Literal["shadow", "soft", "primary", "rejected"] = "shadow"
    enabled: bool = True
    description: str | None = Field(default=None, max_length=1000)
    reason: str = Field(default="registered by v0.7 promotion pipeline", min_length=1, max_length=500)


class ExperimentAssignRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    experiment_id: str = Field(min_length=1)
    request_id: str = Field(min_length=1)
    user_id: str | None = None


class DeleteUserDataRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    user_id: str = Field(min_length=1)


class DeleteRequestDataRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    request_id: str = Field(min_length=1)


class RetentionRunRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    retention_days: int | None = Field(default=None, ge=1, le=3650)
    dry_run: bool = True


class SnapshotCreateRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    snapshot_id: str | None = Field(default=None, min_length=1, max_length=120)
    start_time: datetime | None = None
    end_time: datetime | None = None

    @model_validator(mode="after")
    def validate_range(self) -> "SnapshotCreateRequest":
        if self.start_time and self.end_time and self.start_time >= self.end_time:
            raise ValueError("start_time must be earlier than end_time")
        return self
