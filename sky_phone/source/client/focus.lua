SkyPhoneFocus = {}

function SkyPhoneFocus.Resolve(state)
    if state.activity_suspended then
        return { focused = false, keep_input = false }
    end
    if state.call_focus then
        return { focused = true, keep_input = false }
    end
    if state.camera_active and not state.camera_nui_focused then
        return { focused = false, keep_input = true }
    end
    return {
        focused = state.is_open
            or state.notification_focus
            or state.payphone_focus
            or state.sim_picker_open
            or (state.camera_active and state.camera_nui_focused),
        keep_input = false,
    }
end
