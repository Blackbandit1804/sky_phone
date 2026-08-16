SkyPhoneFocus = {}

local blocked_phone_controls = { 19, 24, 140, 141, 142, 257, 263, 264 }

function SkyPhoneFocus.ApplyGameInputControls()
    for _, control in ipairs(blocked_phone_controls) do
        DisableControlAction(0, control, true)
    end
    DisablePlayerFiring(PlayerId(), true)
end

function SkyPhoneFocus.Resolve(state)
    if state.activity_suspended then
        return { cursor = false, focused = false, game_input = false, keep_input = false }
    end
    if state.call_focus then
        return { cursor = true, focused = true, game_input = false, keep_input = false }
    end
    if state.camera_active and not state.camera_nui_focused then
        return { cursor = false, focused = true, game_input = false, keep_input = true }
    end
    local game_input = state.is_open and state.allow_movement and not state.camera_active
    local focused = state.is_open
        or state.notification_focus
        or state.payphone_focus
        or state.sim_picker_open
        or (state.camera_active and state.camera_nui_focused)
    return {
        cursor = focused and not (game_input and state.cursor_disabled),
        focused = focused,
        game_input = game_input,
        keep_input = game_input,
    }
end
