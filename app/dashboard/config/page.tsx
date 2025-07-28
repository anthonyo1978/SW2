"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"

// For now, import the config statically
// import initialConfig from "@/lib/client-form-config.json"

export default function ConfigPanel() {
  // Local state for editing
  const [config, setConfig] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)

  // Load config from API on mount
  useEffect(() => {
    fetch('/api/form-config', { credentials: 'include' })
      .then(res => res.json())
      .then(data => {
        setConfig(Array.isArray(data) ? data : [])
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  // Section controls
  const toggleSection = (idx: number) => {
    setConfig(cfg =>
      cfg.map((section, i) =>
        i === idx ? { ...section, enabled: !section.enabled } : section
      )
    )
  }

  const editSectionName = (idx: number, name: string) => {
    setConfig(cfg =>
      cfg.map((section, i) =>
        i === idx ? { ...section, section: name } : section
      )
    )
  }

  const addSection = () => {
    setConfig(cfg => [
      ...cfg,
      { section: "New Section", enabled: true, fields: [] }
    ])
  }

  const deleteSection = (idx: number) => {
    setConfig(cfg => cfg.filter((_, i) => i !== idx))
  }

  // Field controls
  const toggleField = (sectionIdx: number, fieldIdx: number) => {
    setConfig(cfg =>
      cfg.map((section, i) =>
        i === sectionIdx
          ? {
              ...section,
              fields: section.fields.map((field, j) =>
                j === fieldIdx
                  ? { ...field, enabled: !("enabled" in field ? field.enabled : true) }
                  : field
              )
            }
          : section
      )
    )
  }

  const editField = (sectionIdx: number, fieldIdx: number, key: string, value: any) => {
    setConfig(cfg =>
      cfg.map((section, i) =>
        i === sectionIdx
          ? {
              ...section,
              fields: section.fields.map((field, j) =>
                j === fieldIdx ? { ...field, [key]: value } : field
              )
            }
          : section
      )
    )
  }

  const addField = (sectionIdx: number) => {
    setConfig(cfg =>
      cfg.map((section, i) =>
        i === sectionIdx
          ? {
              ...section,
              fields: [
                ...section.fields,
                { name: "new_field", label: "New Field", type: "text", required: false, enabled: true }
              ]
            }
          : section
      )
    )
  }

  const deleteField = (sectionIdx: number, fieldIdx: number) => {
    setConfig(cfg =>
      cfg.map((section, i) =>
        i === sectionIdx
          ? { ...section, fields: section.fields.filter((_, j) => j !== fieldIdx) }
          : section
      )
    )
  }

  // Save handler (now saves to API)
  const saveConfig = () => {
    setSaving(true)
    setSaveSuccess(false)
    fetch('/api/form-config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ config }),
      credentials: 'include',
    })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setSaveSuccess(true)
        } else {
          alert('Failed to save config: ' + (data.error || 'Unknown error'))
        }
        setSaving(false)
      })
      .catch(() => {
        alert('Failed to save config (network error)')
        setSaving(false)
      })
  }

  return (
    <div className="max-w-3xl mx-auto py-8">
      <h1 className="text-2xl font-bold mb-6">Form Config Panel</h1>
      {loading ? (
        <div className="text-gray-500">Loading config...</div>
      ) : config.length === 0 ? (
        <div className="text-gray-500">No config found. Add a section to get started.</div>
      ) : config.map((section: any, sectionIdx: number) => (
        <Card key={sectionIdx} className="mb-6">
          <CardHeader className="flex flex-row items-center justify-between">
            <Input
              value={section.section}
              onChange={e => editSectionName(sectionIdx, e.target.value)}
              className="font-bold text-lg"
            />
            <div className="flex items-center gap-2">
              <Switch checked={section.enabled} onCheckedChange={() => toggleSection(sectionIdx)} />
              <Button variant="destructive" onClick={() => deleteSection(sectionIdx)}>
                Delete Section
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="mb-4">
              {/* Field List Headers */}
              <div className="flex items-center gap-2 mb-2 font-semibold text-xs text-gray-500">
                <span style={{ width: 40 }}></span> {/* Switch column */}
                <span className="w-40">Label</span>
                <span className="w-32">Name</span>
                <span className="w-24">Type</span>
                <span className="w-20">Required</span>
                <span className="w-40">Options</span>
                <span style={{ width: 60 }}></span> {/* Delete button */}
              </div>
              <Button size="sm" onClick={() => addField(sectionIdx)}>
                Add Field
              </Button>
            </div>
            {section.fields.map((field: any, fieldIdx: number) => (
              <div key={fieldIdx} className="flex items-center gap-2 mb-2">
                <Switch
                  checked={!("enabled" in field) || Boolean(field.enabled)}
                  onCheckedChange={() => toggleField(sectionIdx, fieldIdx)}
                />
                <Input
                  value={field.label}
                  onChange={e => editField(sectionIdx, fieldIdx, "label", e.target.value)}
                  placeholder="Field Label"
                  className="w-40"
                />
                <Input
                  value={field.name}
                  onChange={e => editField(sectionIdx, fieldIdx, "name", e.target.value)}
                  placeholder="Field Name (database key)"
                  className="w-32"
                />
                <select
                  value={field.type}
                  onChange={e => editField(sectionIdx, fieldIdx, "type", e.target.value)}
                  className="border rounded px-2 py-1 w-24"
                >
                  <option value="text">Text</option>
                  <option value="textarea">Textarea</option>
                  <option value="select">Select</option>
                  <option value="date">Date</option>
                  {/* Add more types as needed */}
                </select>
                <label className="w-20 flex items-center justify-center">
                  <input
                    type="checkbox"
                    checked={"required" in field ? Boolean(field.required) : false}
                    onChange={e => editField(sectionIdx, fieldIdx, "required", e.target.checked)}
                  />
                  <span className="ml-1">Required</span>
                </label>
                {field.type === "select" && "options" in field && Array.isArray(field.options) && (
                  <Textarea
                    value={field.options ? field.options.join("\n") : ""}
                    onChange={e =>
                      editField(sectionIdx, fieldIdx, "options", e.target.value.split("\n"))
                    }
                    placeholder="Options (one per line)"
                    className="w-40"
                  />
                )}
                <Button variant="destructive" size="sm" onClick={() => deleteField(sectionIdx, fieldIdx)}>
                  Delete
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      ))}
      <div className="flex gap-4 mt-6 items-center">
        <Button onClick={addSection}>Add Section</Button>
        <Button onClick={saveConfig} disabled={saving}>
          {saving ? 'Saving...' : 'Save Changes'}
        </Button>
        {saveSuccess && <span className="text-green-600 text-sm">Saved!</span>}
      </div>
    </div>
  )
} 