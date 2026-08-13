dofile("sky_phone/source/server/payphones.lua")

local allowed_models = {
    prop_phonebox_01a = true,
    prop_phonebox_04 = true,
}

local locations, rejected = SkyPhonePayphones.ValidateLocations({
    { model = "prop_phonebox_01a", coords = { x = 100.0, y = 200.0, z = 30.0 } },
    { model = "prop_phonebox_04", coords = { x = 105.0, y = 200.0, z = 30.0 } },
    { model = "not_allowed", coords = { x = 100.0, y = 200.0, z = 30.0 } },
    { model = "prop_phonebox_01a", coords = { x = "100", y = 200.0, z = 30.0 } },
    { model = "prop_phonebox_01a", coords = { x = 10001.0, y = 200.0, z = 30.0 } },
    "malformed",
}, allowed_models)

assert(#locations == 2, "only strictly valid configured locations must be accepted")
assert(rejected == 4, "every malformed or disallowed configured location must be reported")

local first = SkyPhonePayphones.FindNearest(locations, { x = 101.0, y = 200.0, z = 30.0 }, 3.0)
assert(first and first.model == "prop_phonebox_01a", "nearest configured booth must be selected")

local second = SkyPhonePayphones.FindNearest(locations, { x = 104.0, y = 200.0, z = 30.0 }, 3.0)
assert(second and second.model == "prop_phonebox_04", "another configured booth must be selected by proximity")

assert(
    not SkyPhonePayphones.FindNearest(locations, { x = 0.0, y = 0.0, z = 0.0 }, 3.0),
    "a player away from every configured booth must be rejected"
)
assert(
    not SkyPhonePayphones.FindNearest(locations, { x = "100", y = 200.0, z = 30.0 }, 3.0),
    "malformed player coordinates must be rejected"
)
assert(
    not SkyPhonePayphones.FindNearest(locations, { x = 100.0, y = 200.0, z = 30.0 }, 0.0),
    "an invalid validation distance must be rejected"
)

print("Server payphone validation tests passed")
