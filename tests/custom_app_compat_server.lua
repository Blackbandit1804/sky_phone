local event_handlers = {}
local registered_exports = {}
local sent_events = {}
local invoking_resource = nil

exports = setmetatable({}, {
    __call = function(_, export_name, handler)
        registered_exports[export_name] = handler
    end,
})

function GetCurrentResourceName()
    return "sky_phone"
end

function GetInvokingResource()
    return invoking_resource
end

function GetGameTimer()
    return 5000
end

function RegisterNetEvent(event_name, handler)
    event_handlers[event_name] = handler
end

function AddEventHandler() end

function TriggerClientEvent(event_name, target, ...)
    sent_events[#sent_events + 1] = {
        arguments = { ... },
        event_name = event_name,
        target = target,
    }
end

dofile("sky_phone/source/shared/custom_app_compat.lua")
dofile("sky_phone/source/server/custom_app_compat.lua")

invoking_resource = "high_server_app"
local add_success, add_error = registered_exports.addApplication("bankingv2", {
    externalUrl = "@high_server_app/ui/index.html",
}, {
    en = {
        label = "Banking",
        description = "Banking app",
    },
})
assert(add_success and add_error == nil, "High server addApplication must register")
assert(#sent_events == 1, "High server registration must broadcast an update")
assert(sent_events[1].event_name == "sky_phone:compat:high:client:syncApplication", "High sync event must be used")
assert(sent_events[1].arguments[1] == "high_server_app", "High sync must preserve the owner")

invoking_resource = "other_server_app"
local duplicate_success, duplicate_error = registered_exports.addApplication("bankingv2", {
    externalUrl = "@other_server_app/ui/index.html",
})
assert(not duplicate_success and duplicate_error == "duplicate_app_id", "High cross-owner replacement must fail")

source = 42
event_handlers["sky_phone:compat:high:server:requestSnapshot"]()
assert(#sent_events == 2, "High snapshot request must emit one response")
assert(sent_events[2].event_name == "sky_phone:compat:high:client:replaceSnapshot", "High snapshot event must be used")
assert(sent_events[2].target == 42, "High snapshot must target only the requester")
assert(#sent_events[2].arguments[1] == 1, "High snapshot must include the registered app")

print("Custom app compatibility server tests passed")
