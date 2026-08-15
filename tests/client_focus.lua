dofile("sky_phone/source/client/focus.lua")

local function resolve(overrides)
    local state = {
        activity_suspended = false,
        allow_movement = false,
        call_focus = false,
        camera_active = false,
        camera_nui_focused = true,
        is_open = false,
        notification_focus = false,
        payphone_focus = false,
        sim_picker_open = false,
    }
    for key, value in pairs(overrides or {}) do
        state[key] = value
    end
    return SkyPhoneFocus.Resolve(state)
end

local idle = resolve()
assert(not idle.focused and not idle.keep_input, "idle NUI must release focus and game input override")

local minimized_call = resolve()
assert(not minimized_call.focused, "a replayed call without an attention claim must stay unfocused")

local incoming_call = resolve({ call_focus = true })
assert(incoming_call.focused and not incoming_call.keep_input, "incoming call attention must focus the NUI")

local stationary_phone = resolve({ is_open = true })
assert(
    stationary_phone.focused and not stationary_phone.keep_input,
    "an open phone must block game input when movement is disabled"
)

local movable_phone = resolve({ allow_movement = true, is_open = true })
assert(
    movable_phone.focused and movable_phone.keep_input,
    "an open phone must keep game input when movement is enabled"
)

local movable_notification = resolve({ allow_movement = true, notification_focus = true })
assert(
    movable_notification.focused and not movable_notification.keep_input,
    "movement configuration must not affect a notification without an open phone"
)

local camera_game_input = resolve({
    camera_active = true,
    camera_nui_focused = false,
    is_open = true,
})
assert(
    not camera_game_input.focused and camera_game_input.keep_input,
    "unfocused camera must own game input over the open phone"
)

local focused_camera = resolve({
    allow_movement = true,
    camera_active = true,
    camera_nui_focused = true,
    is_open = true,
})
assert(
    focused_camera.focused and not focused_camera.keep_input,
    "focused camera must override movement configuration until Space releases NUI focus"
)

local camera_interrupted_by_call = resolve({
    call_focus = true,
    camera_active = true,
    camera_nui_focused = false,
    is_open = true,
})
assert(
    camera_interrupted_by_call.focused and not camera_interrupted_by_call.keep_input,
    "incoming call attention must override unfocused camera input"
)

local camera_after_connected_call = resolve({
    call_focus = false,
    camera_active = true,
    camera_nui_focused = false,
    is_open = true,
})
assert(
    not camera_after_connected_call.focused and camera_after_connected_call.keep_input,
    "connected call without an attention claim must restore unfocused camera input"
)

local payphone_closed_behind_phone = resolve({ is_open = true, payphone_focus = false })
assert(payphone_closed_behind_phone.focused, "releasing payphone focus must not clear mobile phone focus")

local suspended = resolve({ activity_suspended = true, call_focus = true, is_open = true })
assert(not suspended.focused and not suspended.keep_input, "suspended activities must mask every focus claim")

print("Client focus tests passed")
