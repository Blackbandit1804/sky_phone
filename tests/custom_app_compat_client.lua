local registered_exports = {}
local invoking_resource = nil

Config = {
    Bridge = {
        Locale = "en",
    },
    CustomApps = {
        AllowRemoteOrigins = {},
        BundledApps = false,
        Enabled = true,
        ExternalApps = true,
        MaximumMessageBytes = 65536,
        MaximumStorageBytesPerApp = 262144,
        MaximumStorageKeyLength = 64,
        MaximumStorageValueBytes = 65536,
        ReadyTimeoutMs = 8000,
        TrustedAdapters = {},
    },
}

json = {
    decode = function()
        return {}
    end,
    encode = function()
        return "{}"
    end,
}

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

function GetResourceState(resource_name)
    if resource_name == "missing_resource" then
        return "missing"
    end
    return "started"
end

function RegisterNUICallback() end
function RegisterNetEvent() end
function AddEventHandler() end
function SendNUIMessage() end
function TriggerServerEvent() end
function TriggerEvent() end

function CreateThread(handler)
    handler()
end

dofile("sky_phone/source/shared/custom_apps.lua")
dofile("sky_phone/source/shared/custom_app_compat.lua")
dofile("sky_phone/source/client/custom_apps.lua")
dofile("sky_phone/source/client/custom_app_compat.lua")

invoking_resource = "lb_app"
local lb_success, lb_error = registered_exports.AddCustomApp({
    identifier = "dispatch",
    name = "Dispatch",
    description = "Dispatch terminal",
    ui = "ui/index.html",
})
assert(lb_success and lb_error == nil, "LB AddCustomApp must register through the shared export")

invoking_resource = "another_app"
local duplicate_success, duplicate_error = registered_exports.AddCustomApp({
    identifier = "dispatch",
    name = "Hijack",
    description = "Hijack",
    ui = "ui/index.html",
})
assert(not duplicate_success and duplicate_error == "duplicate_app_id", "cross-owner IDs must be rejected")

local remove_success, remove_error = registered_exports.RemoveCustomApp("dispatch")
assert(not remove_success and remove_error == "app_owner_mismatch", "cross-owner removal must be rejected")

invoking_resource = "lb_app"
assert(registered_exports.RemoveCustomApp("dispatch"), "the LB owner must be able to remove its app")

invoking_resource = "yseries_app"
assert(registered_exports.AddCustomApp({
    key = "slots",
    name = "Slots",
    ui = "https://cfx-nui-yseries_app/ui/index.html",
}), "YSeries AddCustomApp must be selected from the key field")

local ambiguous_success, ambiguous_error = registered_exports.AddCustomApp({
    id = "ambiguous",
    identifier = "ambiguous",
    name = "Ambiguous",
    ui = "ui/index.html",
})
assert(not ambiguous_success and ambiguous_error == "ambiguous_app_provider", "ambiguous schemas must fail")

invoking_resource = "mov_app"
assert(registered_exports.AddApplication({
    name = "market",
    label = "Market",
    ui = "https://cfx-nui-mov_app/ui/index.html",
}), "17mov AddApplication must register")

invoking_resource = "high_app"
assert(registered_exports.addApplication("bankingv2", {
    externalUrl = "@high_app/ui/index.html",
}, {
    en = {
        label = "Banking",
        description = "Banking app",
    },
}), "High addApplication must register")

invoking_resource = "quasar_app"
assert(registered_exports.addCustomApp({
    id = "services",
    label = "Services",
    iframe = {
        url = "https://cfx-nui-quasar_app/ui/index.html",
    },
}), "Quasar addCustomApp must register")

local quasar_apps = registered_exports.getCustomApps()
assert(#quasar_apps == 1 and quasar_apps[1].id == "services", "Quasar getCustomApps must expose the registry")
assert(registered_exports.updateCustomApp("services", {
    label = "City Services",
}), "Quasar updateCustomApp must update an owned app")
assert(registered_exports.removeCustomApp("services"), "Quasar removeCustomApp must remove an owned app")

print("Custom app compatibility client tests passed")
