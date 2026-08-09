Bridge.Housing = {
    ClientProviders = {},
}

function Bridge.Housing.RegisterClientProvider(name, provider)
    assert(type(name) == "string" and name ~= "", "Housing provider name must be a non-empty string")
    assert(type(provider) == "table" and type(provider.execute) == "function", "Housing client provider must implement execute")
    assert(not Bridge.Housing.ClientProviders[name], ("Housing client provider '%s' is already registered"):format(name))
    Bridge.Housing.ClientProviders[name] = provider
end

function Bridge.Housing.Execute(provider_name, action, data)
    local provider = Bridge.Housing.ClientProviders[provider_name]
    if not provider then
        return false, "provider_unavailable"
    end
    return provider.execute(action, data)
end
