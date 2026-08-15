local disabled_control_group = nil
local enabled_controls = {}
local firing_disabled = false

function DisableAllControlActions(group)
    disabled_control_group = group
end

function EnableControlAction(group, control, enabled)
    assert(group == 0 and enabled, "movement controls must be enabled in the primary input group")
    enabled_controls[control] = true
end

function PlayerId()
    return 7
end

function DisablePlayerFiring(player, disabled)
    assert(player == 7, "movement filtering must target the local player")
    firing_disabled = disabled
end

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
assert(
    not idle.cursor and not idle.focused and not idle.keep_input,
    "idle NUI must release focus and game input override"
)

local minimized_call = resolve()
assert(not minimized_call.focused, "a replayed call without an attention claim must stay unfocused")

local incoming_call = resolve({ call_focus = true })
assert(
    incoming_call.cursor and incoming_call.focused and not incoming_call.keep_input,
    "incoming call attention must focus the NUI"
)

local stationary_phone = resolve({ is_open = true })
assert(
    stationary_phone.cursor and stationary_phone.focused and not stationary_phone.keep_input,
    "an open phone must block game input when movement is disabled"
)

local movable_phone = resolve({ allow_movement = true, is_open = true })
assert(
    movable_phone.cursor
        and movable_phone.focused
        and movable_phone.keep_input
        and movable_phone.movement_only,
    "an open phone must keep only movement input when movement is enabled"
)

SkyPhoneFocus.ApplyMovementOnlyControls()
assert(disabled_control_group == 0, "movement filtering must disable the primary input group")
for _, control in ipairs({ 21, 30, 31, 32, 33, 34, 35 }) do
    assert(enabled_controls[control], ("movement control %d must stay enabled"):format(control))
end
assert(not enabled_controls[1] and not enabled_controls[2], "look controls must stay disabled")
assert(not enabled_controls[24] and not enabled_controls[25], "combat controls must stay disabled")
assert(not enabled_controls[22], "jump must stay disabled")
assert(firing_disabled, "player firing must remain disabled while the phone is open")

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
    not camera_game_input.cursor
        and camera_game_input.focused
        and camera_game_input.keep_input
        and not camera_game_input.movement_only,
    "camera movement must keep keyboard focus without retaining the NUI cursor"
)

local focused_camera = resolve({
    allow_movement = true,
    camera_active = true,
    camera_nui_focused = true,
    is_open = true,
})
assert(
    focused_camera.cursor and focused_camera.focused and not focused_camera.keep_input,
    "focused camera must override movement configuration until Space enables passthrough"
)

local camera_interrupted_by_call = resolve({
    call_focus = true,
    camera_active = true,
    camera_nui_focused = false,
    is_open = true,
})
assert(
    camera_interrupted_by_call.cursor
        and camera_interrupted_by_call.focused
        and not camera_interrupted_by_call.keep_input,
    "incoming call attention must override camera passthrough input"
)

local camera_after_connected_call = resolve({
    call_focus = false,
    camera_active = true,
    camera_nui_focused = false,
    is_open = true,
})
assert(
    not camera_after_connected_call.cursor
        and camera_after_connected_call.focused
        and camera_after_connected_call.keep_input,
    "connected call without an attention claim must restore camera movement input"
)

local payphone_closed_behind_phone = resolve({ is_open = true, payphone_focus = false })
assert(payphone_closed_behind_phone.focused, "releasing payphone focus must not clear mobile phone focus")

local suspended = resolve({ activity_suspended = true, call_focus = true, is_open = true })
assert(not suspended.focused and not suspended.keep_input, "suspended activities must mask every focus claim")

print("Client focus tests passed")
