export function downloadBlob(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    link.style.display = 'none'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
}

export function downloadJson(data: unknown, prefix: string): void {
    const filename = `${prefix}-${new Date().toISOString().split('T')[0]}.json`
    const jsonString = JSON.stringify(data, null, 2)
    const uri = `data:application/json;charset=utf-8,${encodeURIComponent(jsonString)}`
    const link = document.createElement('a')
    link.href = uri
    link.download = filename
    link.style.display = 'none'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
}
