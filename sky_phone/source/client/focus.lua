SkyPhoneFocus = {}

function SkyPhoneFocus.Resolve(state)
    if state.activity_suspended then
        return { cursor = false, focused = false, keep_input = false, movement_only = false }
    end
    if state.call_focus then
        return { cursor = true, focused = true, keep_input = false, movement_only = false }
    end
    if state.camera_active and not state.camera_nui_focused then
        return { cursor = false, focused = true, keep_input = true, movement_only = false }
    end
    local movement_only = state.is_open and state.allow_movement and not state.camera_active
    local focused = state.is_open
        or state.notification_focus
        or state.payphone_focus
        or state.sim_picker_open
        or (state.camera_active and state.camera_nui_focused)
    return {
        cursor = focused,
        focused = focused,
        keep_input = movement_only,
        movement_only = movement_only,
    }
end
