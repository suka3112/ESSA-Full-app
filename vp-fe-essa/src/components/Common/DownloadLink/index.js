import React from 'react'

const DownloadLink = ({ url, fileName, children, className, title}) => {
  const handleDownload = async (e) => {
    e.preventDefault()
    if (!url) return
    try {
      const response = await fetch(url)
      const blob = await response.blob()
      const link = document.createElement('a')
      link.href = window.URL.createObjectURL(blob)
      link.download = fileName || 'download'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    } catch (err) {
      console.error('Download failed', err)
    }
  }

  return (
    <a
      href={url}
      className={className}
      download={fileName}
      onClick={handleDownload}
      target="_blank"
      rel="noopener noreferrer"
      title={title}>
      {children}
    </a>
  )
}

export default DownloadLink
