local provider_resources = {
    pma = "pma-voice",
    saltychat = "saltychat",
}
local provider_aliases = {
    ["pma-voice"] = "pma",
    salty = "saltychat",
}

local function resolve_provider()
    local configured = tostring(Config.Calls.VoiceProvider or "")
    local selected = provider_aliases[configured] or configured
    local resource_name = provider_resources[selected]
    if resource_name and GetResourceState(resource_name) == "started" then
        return selected
    end
    return nil
end

function Bridge.Calls.GetProvider()
    return resolve_provider()
end

function Bridge.Calls.SupportsSpeaker()
    return Bridge.Speaker.IsEnabled() and resolve_provider() == "saltychat"
end

function Bridge.Calls.Join(channel)
    local selected = resolve_provider()
    if selected == "pma" then
        local call_channel = tonumber(channel) or 0
        if call_channel <= 0 then
            Bridge.Debug("error", "[sky_phone] Refused to join an invalid PMA call channel.", { always = true })
            return false
        end
        exports["pma-voice"]:setCallChannel(call_channel)
        return true
    end

    if selected == "saltychat" then
        -- SaltyChat call membership is owned by the server bridge.
        return true
    end

    Bridge.Debug(
        "error",
        "[sky_phone] Configured call voice provider '%s' is not supported or not started.",
        tostring(Config.Calls.VoiceProvider),
        { always = true }
    )
    return false
end

function Bridge.Calls.Leave()
    if resolve_provider() == "pma" then
        exports["pma-voice"]:setCallChannel(0)
    end
end
