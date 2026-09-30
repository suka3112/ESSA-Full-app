import React, { useMemo, useRef, useState } from "react";
import './TextEditor.css';
import ReactQuill, { Quill } from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';
import ImageResize from 'quill-image-resize-module-react';
import { fileUpload } from 'api/FileUpload';
import { toast } from "react-toastify";

// Register image resize module only
if (Quill && typeof Quill.register === 'function') {
  Quill.register('modules/imageResize', ImageResize);
}

// We'll use a ref to store the setLoading function so it can be accessed in the handler
let setLoadingRef = null;
function imageHandler() {
  const input = document.createElement('input');
  input.setAttribute('type', 'file');
  input.setAttribute('accept', 'image/*');
  input.click();
  input.onchange = async () => {
    const file = input.files[0];
    if (file) {
      // Image size validation: max 5MB
      const maxSize = 5 * 1024 * 1024; // 5MB in bytes
      if (file.size > maxSize) {
        toast.error('Image size should not exceed 5MB.');
        return;
      }
      // Extra check for file type (in case user bypasses accept attribute)
      const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp'];
      if (!allowedTypes.includes(file.type)) {
        toast.error('Only image files (png, jpg, jpeg, gif, webp) are allowed.');
        return;
      }
      const fd = new FormData();
      fd.append('image', file);
      try {
        if (setLoadingRef) setLoadingRef(true);
        const res = await fileUpload(fd);
        const url = res.data?.data?.url;
        if (url) {
          const quill = this.quill;
          const range = quill.getSelection();
          quill.insertEmbed(range.index, 'image', url);
        } else {
          toast.error('Image upload failed: No URL returned.');
        }
      } catch (err) {
        toast.error('Image upload failed.');
      } finally {
        if (setLoadingRef) setLoadingRef(false);
      }
    }
  };
}

function videoHandler() {
  const input = document.createElement('input');
  input.setAttribute('type', 'file');
  input.setAttribute('accept', 'video/*');
  input.click();
  input.onchange = async () => {
    const file = input.files[0];
    if (file) {
      const fd = new FormData();
      fd.append('image', file); // If your API expects 'video', change this key
      try {
        if (setLoadingRef) setLoadingRef(true);
        const res = await fileUpload(fd);
        const url = res.data?.data?.url;
        if (url) {
          const quill = this.quill;
          const range = quill.getSelection();
          quill.insertEmbed(range.index, 'video', url);
        } else {
          alert('Video upload failed: No URL returned.');
        }
      } catch (err) {
        alert('Video upload failed.');
      } finally {
        if (setLoadingRef) setLoadingRef(false);
      }
    }
  };
}

const modules = {
  toolbar: {
    container: [
      [{ header: '1' }, { header: '2' }, { font: [] }],
      [{ size: [] }],
      ['bold', 'italic', 'underline', 'strike', 'blockquote'],
      [
        { list: 'ordered' },
        { list: 'bullet' },
        { indent: '-1' },
        { indent: '+1' }
      ],
      [{ color: [] }, { background: [] }],
      ['link', 'image', 'video'],
      ['clean'],
      // Use custom HTML for undo/redo
      [
        { undo: '↺' },
        { redo: '↻' }
      ]
    ],
    handlers: {
      image: imageHandler,
      // video: videoHandler
      undo: function () {
        this.quill.history.undo();
      },
      redo: function () {
        this.quill.history.redo();
      }
    }
  },
  clipboard: {
    matchVisual: false
  },
  imageResize: {
    modules: ['Resize', 'DisplaySize']
  },
  history: {
    delay: 1000,
    maxStack: 100,
    userOnly: true
  }
};

const formats = [
  'header',
  'font',
  'size',
  'bold',
  'italic',
  'underline',
  'strike',
  'blockquote',
  'list',
  'bullet',
  'indent',
  'link',
  'image',
  'video',
  'color',
  'background'
];

const TextEditor = ({ placeholder, value, setValue }) => {
  const [loading, setLoading] = useState(false);
  // Expose setLoading to the handler
  setLoadingRef = setLoading;
  // Memoize modules and formats to avoid re-creating on every render
  const quillModules = useMemo(() => modules, []);
  const quillFormats = useMemo(() => formats, []);
  return (
    <div className="custom-quill-editor-wrapper" style={{ position: 'relative' }}>
      {loading && (
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          background: 'rgba(255,255,255,0.7)',
          zIndex: 10,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          <div className="quill-upload-loader" style={{ fontSize: 24, color: 'var(--brand-primary-color, $primary-color)',display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" style={{marginRight:8}}>
              <circle cx="20" cy="20" r="18" stroke="var(--brand-primary-color, $primary-color)" strokeWidth="4" strokeDasharray="90 60" strokeLinecap="round">
                <animateTransform attributeName="transform" type="rotate" from="0 20 20" to="360 20 20" dur="1s" repeatCount="indefinite" />
              </circle>
            </svg>
            Uploading...
          </div>
        </div>
      )}
      <ReactQuill
        theme="snow"
        value={value}
        onChange={setValue}
        placeholder={placeholder}
        modules={quillModules}
        formats={quillFormats}
      />
    </div>
  );
};

export default TextEditor;
