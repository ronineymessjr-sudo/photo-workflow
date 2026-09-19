from pathlib import Path

from director_agent.photoatelier_shoot_planner import SHOT_FRAMING_ZH, build_shoot_plan


def test_shoot_plan_contains_prompt_and_positions(tmp_path: Path):
    result = build_shoot_plan(
        tmp_path,
        request_id="demo-1",
        brief="低饱和、海边单人女生人像，夕阳逆光，电影感",
        output_count=3,
    )
    assert result["style_direction"] == "low-key-cinematic"
    assert result["image_generation_prompt"]
    assert result["generator_prompt"]
    assert result["negative_prompt"]
    assert len(result["shot_plans"]) == 3
    assert all(item["model_position"] and item["photographer_position"] for item in result["shot_plans"])
    assert result["render_policy"]["local_diffusion_role"] == "composition-storyboard-only"
    assert result["render_policy"]["local_diffusion_is_final_photo"] is False


def test_explicit_style_is_respected(tmp_path: Path):
    result = build_shoot_plan(tmp_path, request_id="demo-2", brief="任意需求", requested_style="vivid-sunlit-lifestyle", output_count=1)
    assert result["style_direction"] == "vivid-sunlit-lifestyle"
    assert len(result["shot_plans"]) == 1


def test_clean_chinese_brief_selects_style_and_location_tokens(tmp_path: Path):
    result = build_shoot_plan(
        tmp_path,
        request_id="clean-cn-1",
        brief="低饱和电影感，海边女性人像，夕阳",
        output_count=1,
    )
    assert result["style_direction"] == "low-key-cinematic"
    assert "seaside beach" in result["generator_prompt"]
    assert "golden hour sunset" in result["generator_prompt"]


def test_photographer_facing_fields_are_readable_chinese(tmp_path: Path):
    result = build_shoot_plan(tmp_path, request_id="display-cn-1", brief="电影感人像", requested_style="low-key-cinematic", output_count=1)
    shot = result["shot_plans"][0]
    assert result["style_label"] == "低调电影感"
    assert shot["framing"] in set(SHOT_FRAMING_ZH.values())
    assert shot["photographer_position"].startswith("摄影师")
    assert result["safety_checklist"][0].startswith("开拍前")


def test_embedding_condition_is_explicit_when_index_is_missing(tmp_path: Path):
    result = build_shoot_plan(tmp_path, request_id="demo-3", brief="电影感人像")
    assert result["embedding_condition"]["index_dimension"] == 1152
    assert result["embedding_condition"]["status"] == "embedding-index-unavailable"


def test_shot_plans_have_distinct_camera_languages(tmp_path: Path):
    result = build_shoot_plan(tmp_path, request_id="diverse-angles", brief="城市街头女性时装故事", output_count=8)
    shots = result["shot_plans"]
    assert len(shots) == 8
    assert len({shot["shot_language"] for shot in shots}) == 8
    assert len({shot["photographer_position"] for shot in shots}) == 8
    assert len({shot["framing"] for shot in shots}) == 8
    assert all(shot["generator_prompt"] and shot["negative_prompt"] for shot in shots)
    assert all(shot["crop_boundary"] and shot["set_design"] for shot in shots)
    assert all(shot["must_show"] and shot["reject_if"] for shot in shots)
    assert all(shot["acceptance_gate"]["decision"] == "human-select-before-production" for shot in shots)
    assert any("full body" in shot["generator_prompt"] for shot in shots)
    assert any("overhead" in shot["generator_prompt"] for shot in shots)


def test_extended_plan_has_sixteen_distinct_executable_shots(tmp_path: Path):
    result = build_shoot_plan(
        tmp_path,
        request_id="extended-sixteen",
        brief="双人城市街头品牌故事，三小时，包含人物互动、环境和产品细节",
        output_count=16,
    )
    shots = result["shot_plans"]
    assert len(shots) == 16
    assert len({shot["shot_language"] for shot in shots}) == 16
    assert len({shot["framing"] for shot in shots}) == 16
    assert all(shot["model_pose"] and shot["photographer_position"] for shot in shots)
    assert all(shot["shot_size"] and shot["camera_angle"] for shot in shots)
    assert {"eye-level-medium", "close-expression", "environment-cutaway"}.issubset(
        {shot["shot_language"] for shot in shots}
    )


def test_crop_and_set_rules_cover_known_aesthetic_failures(tmp_path: Path):
    result = build_shoot_plan(tmp_path, request_id="hard-gates", brief="城市人物故事", output_count=8)
    shots = {shot["shot_language"]: shot for shot in result["shot_plans"]}
    assert "脖颈" in shots["extreme-detail"]["crop_boundary"]
    assert "反射" in shots["reflection-frame"]["must_show"]
    assert "70–90°" in shots["overhead-seated"]["must_show"]
    assert "8–12 米" in shots["long-lens-profile"]["must_show"]
    assert "双脚" in shots["ground-level-motion"]["crop_boundary"]


def test_local_xhs_reference_lock_is_attached_to_matching_route():
    repo_root = Path(__file__).resolve().parents[1]
    result = build_shoot_plan(
        repo_root,
        request_id="xhs-lock-1",
        brief="雨夜城市斑马线，高机位俯拍，湿地反光，几何构图，全身人物",
        output_count=1,
    )
    lock = result["reference_lock"]
    assert result["v033_visual_route_recommendation"]["route_id"] == "rain-high-angle-crossing"
    assert lock["selection_source"] == "v033-offline-xhs-retrieval"
    assert len(lock["references"]) == 3
    assert all(Path(item["image_path"]).is_file() for item in lock["references"])
    assert Path(lock["control_reference"]["image_path"]).is_file()
    assert lock["production_release"] is False


def test_workspace_uses_fused_style_prototype():
    repo_root = Path(__file__).resolve().parents[1]
    result = build_shoot_plan(repo_root, request_id="workspace-embedding", brief="低饱和电影感人像")
    assert result["embedding_condition"]["status"] == "style-prototype-conditioned"
    assert result["embedding_condition"]["index_dimension"] == 1152
    assert result["references"][0]["embedding_similarity"] > 0.0
    assert Path(result["references"][0]["image_path"]).is_file()
    assert result["references"][0]["reference_role"] == "authorized-local-finished-photo"
    assert result["references"][0]["subject_pixels_policy"] == "preserve-face-and-body-do-not-regenerate"
    assert "route_match_reason" in result["references"][0]
    assert result["render_policy"]["real_person_output_mode"] == "authorized-reference-first"
    assert result["render_policy"]["background_edit_requires_subject_mask"] is True
    assert result["reference_board"]["subject_pixels_regenerated"] is False
    assert result["reference_board"]["network_used"] is False


def test_workspace_exposes_v031_selector_as_shadow_metadata():
    repo_root = Path(__file__).resolve().parents[1]
    result = build_shoot_plan(repo_root, request_id="selector-shadow", brief="低机位贴地动态街头人像")
    selector = result["agent_selector_shadow"]
    assert selector["status"] in {"shadow-selector-result", "selector-unavailable"}
    assert selector["human_selection_required"] is True
    assert selector["production_release"] is False


def test_v071_selector_puts_explicit_master_route_first_for_default_external_turn():
    repo_root = Path(__file__).resolve().parents[1]
    result = build_shoot_plan(
        repo_root,
        request_id="v070-default-route",
        brief="长焦侧面拍经过的人，压缩前中后景，视线前方留出大量负空间",
        output_count=3,
    )
    assert result["master_route_recommendation"]["route_id"] == "telephoto-profile"
    assert result["master_route_recommendation"]["selection_source"] == "v073-contract-selector"
    assert result["shot_plans"][0]["master_shot_language"] == "telephoto-profile"
