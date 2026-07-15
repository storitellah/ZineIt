--[[----------------------------------------------------------------------------
ZineItJson — a small JSON encoder.

The Lightroom SDK ships no JSON library, and a .bak must be byte-for-byte
parseable by the browser. This encoder is deliberately tiny and total: it
handles exactly the value types a ZineIt project contains, and refuses
anything it cannot represent faithfully rather than emitting silent garbage.

Arrays must be marked with Json.array{...} — an empty Lua table is ambiguous,
and ZineIt requires `elements: []`, never `elements: {}`.
------------------------------------------------------------------------------]]

local Json = {}

Json.arrayMt = { __jsonarray = true }

--- Mark a table as a JSON array.
function Json.array(t)
  return setmetatable(t or {}, Json.arrayMt)
end

function Json.isArray(t)
  return getmetatable(t) == Json.arrayMt
end

local ESCAPES = {
  ['"']  = '\\"',
  ['\\'] = '\\\\',
  ['\b'] = '\\b',
  ['\f'] = '\\f',
  ['\n'] = '\\n',
  ['\r'] = '\\r',
  ['\t'] = '\\t',
}

--- Escape a Lua string into a JSON string body (without surrounding quotes).
function Json.escape(s)
  return (string.gsub(s, '[%c"\\]', function(c)
    return ESCAPES[c] or string.format('\\u%04x', string.byte(c))
  end))
end

local function encodeNumber(v)
  if v ~= v then error('cannot encode NaN as JSON') end
  if v == math.huge or v == -math.huge then error('cannot encode infinity as JSON') end
  if math.type and math.type(v) == 'integer' then return string.format('%d', v) end
  if v == math.floor(v) and math.abs(v) < 1e15 then return string.format('%d', v) end
  -- %.14g keeps inch geometry exact (0.25, 2.75) without scientific notation
  return (string.format('%.14g', v))
end

local encodeValue

local function encodeTable(v, out)
  if Json.isArray(v) then
    out[#out + 1] = '['
    for i = 1, #v do
      if i > 1 then out[#out + 1] = ',' end
      encodeValue(v[i], out)
    end
    out[#out + 1] = ']'
  else
    -- object: sort keys so output is deterministic (diffable, testable)
    local keys = {}
    for k in pairs(v) do
      if type(k) ~= 'string' then error('JSON object keys must be strings, got ' .. type(k)) end
      keys[#keys + 1] = k
    end
    table.sort(keys)
    out[#out + 1] = '{'
    for i = 1, #keys do
      if i > 1 then out[#out + 1] = ',' end
      out[#out + 1] = '"' .. Json.escape(keys[i]) .. '":'
      encodeValue(v[keys[i]], out)
    end
    out[#out + 1] = '}'
  end
end

encodeValue = function(v, out)
  local t = type(v)
  if v == nil or v == Json.null then
    out[#out + 1] = 'null'
  elseif t == 'boolean' then
    out[#out + 1] = tostring(v)
  elseif t == 'number' then
    out[#out + 1] = encodeNumber(v)
  elseif t == 'string' then
    out[#out + 1] = '"' .. Json.escape(v) .. '"'
  elseif t == 'table' then
    encodeTable(v, out)
  else
    error('cannot encode ' .. t .. ' as JSON')
  end
end

--- Sentinel for an explicit JSON null (Lua nil vanishes from tables).
Json.null = setmetatable({}, { __tostring = function() return 'null' end })

--- Encode a value to a JSON string.
function Json.encode(v)
  local out = {}
  encodeValue(v, out)
  return table.concat(out)
end

return Json
