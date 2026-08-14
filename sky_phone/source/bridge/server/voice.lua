local call_provider_resources = {
    pma = "pma-voice",
    saltychat = "saltychat",
}
local call_provider_aliases = {
    ["pma-voice"] = "pma",
    salty = "saltychat",
}
local radio_provider_resources = {
    yaca = "yaca-voice",
    pma = "pma-voice",
    saltychat = "saltychat",
}
local radio_provider_aliases = {
    ["yaca-voice"] = "yaca",
    ["pma-voice"] = "pma",
    salty = "saltychat",
}

local function resolve_call_provider()
    local configured = tostring(Config.Calls.VoiceProvider or "")
    local selected = call_provider_aliases[configured] or configured
    local resource_name = call_provider_resources[selected]
    if resource_name and GetResourceState(resource_name) == "started" then
        return selected
    end
    return nil
end

local function resolve_radio_provider()
    local configured = tostring(Config.Radio.VoiceProvider or "")
    if configured ~= "auto" then
        local selected = radio_provider_aliases[configured] or configured
        local resource_name = radio_provider_resources[selected]
        if resource_name and GetResourceState(resource_name) == "started" then
            return selected
        end
        return nil
    end

    for _, candidate in ipairs({ "yaca", "pma", "saltychat" }) do
        if GetResourceState(radio_provider_resources[candidate]) == "started" then
            return candidate
        end
    end
    return nil
end

function Bridge.Calls.GetProvider()
    return resolve_call_provider()
end

function Bridge.Calls.IsAvailable()
    return resolve_call_provider() ~= nil
end

function Bridge.Calls.SupportsSpeaker()
    return Bridge.Speaker.IsEnabled() and resolve_call_provider() == "saltychat"
end

function Bridge.Calls.Start(identifier, player_handles)
    local selected = resolve_call_provider()
    if selected == "pma" then
        return true, selected
    end
    if selected ~= "saltychat" then
        return false, nil
    end

    local success, error_message = pcall(function()
        exports.saltychat:AddPlayersToCall(tostring(identifier), player_handles)
    end)
    if not success then
        Bridge.Debug(
            "error",
            "[sky_phone] SaltyChat could not add players to call %s: %s",
            tostring(identifier),
            tostring(error_message),
            { always = true }
        )
        return false, selected
    end
    return true, selected
end

function Bridge.Calls.Stop(identifier, player_handles, provider)
    local selected = provider or resolve_call_provider()
    if selected ~= "saltychat" or GetResourceState("saltychat") ~= "started" then
        return
    end

    local success, error_message = pcall(function()
        exports.saltychat:RemovePlayersFromCall(tostring(identifier), player_handles)
    end)
    if not success then
        Bridge.Debug(
            "error",
            "[sky_phone] SaltyChat could not remove players from call %s: %s",
            tostring(identifier),
            tostring(error_message),
            { always = true }
        )
    end
end

function Bridge.Calls.SetSpeaker(player_source, enabled, provider)
    if enabled == true and not Bridge.Speaker.IsEnabled() then
        return false
    end
    local selected = provider or resolve_call_provider()
    if selected ~= "saltychat" or GetResourceState("saltychat") ~= "started" then
        return false
    end

    local success, error_message = pcall(function()
        exports.saltychat:SetPhoneSpeaker(tonumber(player_source), enabled == true)
    end)
    if not success then
        Bridge.Debug(
            "error",
            "[sky_phone] SaltyChat could not update the phone speaker for source %s: %s",
            tostring(player_source),
            tostring(error_message),
            { always = true }
        )
        return false
    end
    return true
end

function Bridge.Radio.GetProvider()
    return resolve_radio_provider()
end

function Bridge.Radio.SupportsSecondary()
    local selected = resolve_radio_provider()
    return Config.Radio.AllowSecondary and (selected == "yaca" or selected == "saltychat")
end

function Bridge.Radio.SupportsSpeaker()
    return Bridge.Speaker.IsEnabled() and resolve_radio_provider() == "saltychat"
end

function Bridge.Radio.SetPlayerSpeaker(player_source, enabled)
    if enabled == true and not Bridge.Speaker.IsEnabled() then
        return false
    end
    if resolve_radio_provider() ~= "saltychat" then
        return false
    end

    local success, error_message = pcall(function()
        exports.saltychat:SetPlayerRadioSpeaker(tonumber(player_source), enabled == true)
    end)
    if not success then
        Bridge.Debug(
            "error",
            "[sky_phone] SaltyChat could not update the radio speaker for source %s: %s",
            tostring(player_source),
            tostring(error_message),
            { always = true }
        )
        return false
    end
    return true
end
