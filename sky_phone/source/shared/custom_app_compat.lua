SkyPhoneCompatibility = {}

SkyPhoneCompatibility.Providers = {
    lb = "lb_phone",
    seventeen = "17mov",
    high = "high_phone",
    quasar = "quasar_v3",
    yseries = "yseries",
}

local function normalize_at_resource_url(owner_resource, url, error_prefix)
    if type(url) ~= "string" or url == "" then
        return nil, "invalid_" .. error_prefix
    end
    if url:sub(1, 7) == "http://" then
        return nil, "insecure_" .. error_prefix
    end
    if url:sub(1, 1) ~= "@" then
        return url
    end

    local url_owner, url_path = url:match("^@([^/]+)/(.+)$")
    if url_owner ~= owner_resource or not url_path then
        return nil, error_prefix .. "_owner_mismatch"
    end
    return owner_resource .. "/" .. url_path
end

local function build_locale_maps(app_name, locales)
    local names = {}
    local descriptions = {}

    if type(locales) == "table" then
        for locale, locale_data in pairs(locales) do
            if type(locale) == "string" and type(locale_data) == "table" then
                if type(locale_data.label) == "string" and locale_data.label ~= "" then
                    names[locale] = locale_data.label
                end
                if type(locale_data.description) == "string" and locale_data.description ~= "" then
                    descriptions[locale] = locale_data.description
                end
            end
        end
    end

    if not next(names) then
        return app_name, app_name
    end
    for locale, label in pairs(names) do
        if not descriptions[locale] then
            descriptions[locale] = label
        end
    end
    return names, descriptions
end

function SkyPhoneCompatibility.CopyQuasarData(app_data)
    local copy = {}
    for key, value in pairs(app_data) do
        if key == "iframe" and type(value) == "table" then
            copy.iframe = {}
            for iframe_key, iframe_value in pairs(value) do
                copy.iframe[iframe_key] = iframe_value
            end
        else
            copy[key] = value
        end
    end
    return copy
end

function SkyPhoneCompatibility.BuildLbDefinition(owner_resource, app_data)
    if type(app_data) ~= "table" or type(app_data.identifier) ~= "string" then
        return nil, "invalid_app_data"
    end

    local ui, ui_error = normalize_at_resource_url(owner_resource, app_data.ui, "ui")
    if not ui then
        return nil, ui_error
    end

    return {
        schemaVersion = 1,
        id = app_data.identifier,
        name = app_data.name,
        description = app_data.description,
        developer = app_data.developer,
        category = app_data.game and "games" or "utilities",
        ui = ui,
        bridgeMode = "legacy",
        icon = app_data.icon,
        defaultInstalled = app_data.defaultApp or false,
        removable = not app_data.defaultApp,
        orientation = app_data.landscape and "landscape" or "portrait",
        onInstall = app_data.onInstall,
        onOpen = app_data.onOpen or app_data.onUse,
        onClose = app_data.onClose,
        compatibility = {
            provider = SkyPhoneCompatibility.Providers.lb,
            apiVersion = 1,
        },
    }
end

function SkyPhoneCompatibility.Build17MovDefinition(app_data)
    if type(app_data) ~= "table" or type(app_data.name) ~= "string" then
        return nil, "invalid_app_data"
    end

    return {
        schemaVersion = 1,
        id = app_data.name,
        name = app_data.label,
        description = app_data.description or app_data.label,
        category = "utilities",
        ui = app_data.ui,
        bridgeMode = "legacy",
        icon = app_data.icon,
        iconBackground = type(app_data.iconBackground) == "string" and app_data.iconBackground or nil,
        defaultInstalled = app_data.default or app_data.preInstalled or false,
        removable = not app_data.default,
        orientation = "portrait",
        compatibility = {
            provider = SkyPhoneCompatibility.Providers.seventeen,
            apiVersion = 1,
        },
    }
end

function SkyPhoneCompatibility.BuildHighDefinition(owner_resource, app_name, data, locales)
    if type(owner_resource) ~= "string" or type(app_name) ~= "string" or type(data) ~= "table" then
        return nil, "invalid_app_data"
    end
    if #app_name > 64 or not app_name:match("^[a-z0-9][a-z0-9._-]+$") then
        return nil, "invalid_app_id"
    end

    local external_url, url_error = normalize_at_resource_url(
        owner_resource,
        data.externalUrl,
        "external_url"
    )
    if not external_url then
        return nil, url_error
    end

    local name, description = build_locale_maps(app_name, locales)
    local icon = type(data.icon) == "table" and data.icon.imageUrl or data.icon
    return {
        schemaVersion = 1,
        id = app_name,
        name = name,
        description = description,
        developer = data.developer,
        category = "utilities",
        ui = external_url,
        bridgeMode = "legacy",
        icon = icon,
        iconBackground = type(data.icon) == "table" and data.icon.background or nil,
        defaultInstalled = data.preAdded or false,
        removable = data.removable ~= false,
        orientation = "portrait",
        compatibility = {
            provider = SkyPhoneCompatibility.Providers.high,
            apiVersion = 1,
        },
    }
end

function SkyPhoneCompatibility.BuildQuasarDefinition(app_data)
    local iframe_url = type(app_data) == "table"
        and type(app_data.iframe) == "table"
        and app_data.iframe.url
        or nil
    if type(app_data) ~= "table"
        or type(app_data.id) ~= "string"
        or type(app_data.label) ~= "string"
        or type(iframe_url) ~= "string"
    then
        return nil, "invalid_app_data"
    end

    return {
        schemaVersion = 1,
        id = app_data.id,
        name = app_data.label,
        description = app_data.description or app_data.label,
        category = "utilities",
        ui = iframe_url,
        bridgeMode = "legacy",
        icon = app_data.icon,
        defaultInstalled = app_data.defaultInstalled or false,
        removable = true,
        orientation = "portrait",
        compatibility = {
            provider = SkyPhoneCompatibility.Providers.quasar,
            apiVersion = 1,
        },
    }
end

function SkyPhoneCompatibility.BuildYSeriesDefinition(app_data)
    if type(app_data) ~= "table" or type(app_data.key) ~= "string" then
        return nil, "invalid_app_data"
    end

    local icon = app_data.icon
    if type(icon) == "table" then
        icon = icon.yos or icon.humanoid
    end

    return {
        schemaVersion = 1,
        id = app_data.key,
        name = app_data.name,
        description = app_data.description or app_data.name,
        category = app_data.game and "games" or "utilities",
        ui = app_data.ui,
        bridgeMode = "legacy",
        icon = icon,
        defaultInstalled = app_data.defaultApp or false,
        removable = true,
        orientation = "portrait",
        compatibility = {
            provider = SkyPhoneCompatibility.Providers.yseries,
            apiVersion = 1,
        },
    }
end
