export async function parsePdf(file) {
  const form = new FormData()
  form.append('file', file)

  const res = await fetch('/parsefile/', { method: 'POST', body: form })

  if (!res.ok) {
    throw new Error(`Server responded ${res.status} ${res.statusText}`)
  }

  const payload = await res.json()
  return payload.response
}