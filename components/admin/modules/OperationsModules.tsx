'use client';

import { useState } from 'react';
import Image from 'next/image';
import { RefreshCw, Trash2, Upload } from 'lucide-react';
import { HousekeepingTask, MaintenanceIssue, MediaAsset, RoleSlug } from '@/lib/types';
import { roleHasPermission } from '@/lib/auth/permissions';
import { AdminSnapshotData } from '@/components/admin/admin-types';

export function HousekeepingModule({
  data,
  role,
  onRefresh,
}: {
  data: AdminSnapshotData;
  role: RoleSlug;
  onRefresh: () => Promise<void>;
}) {
  const canManage = roleHasPermission(role, 'housekeeping:manage');
  const [roomId, setRoomId] = useState(data.rooms[0]?.id || '');
  const [taskType, setTaskType] = useState<HousekeepingTask['task_type']>('daily_refresh');
  const [notes, setNotes] = useState('');

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    await fetch('/api/admin/housekeeping', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        physicalRoomId: roomId,
        taskType,
        status: 'pending',
        notes,
      }),
    });
    setNotes('');
    await onRefresh();
  };

  const handleStatusChange = async (taskId: string, status: HousekeepingTask['status']) => {
    await fetch('/api/admin/housekeeping', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: taskId, status }),
    });
    await onRefresh();
  };

  return (
    <div className="space-y-6">
      {canManage ? (
        <form onSubmit={handleCreateTask} className="bg-white border border-[#E5DFD5] p-5 space-y-3">
          <h2 className="text-sm font-semibold text-[#171614]">Queue Housekeeping Task</h2>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <select
              value={roomId}
              onChange={(e) => setRoomId(e.target.value)}
              className="h-9 px-3 text-xs border border-[#D8D1C5] bg-[#FAF9F6] font-mono"
            >
              {data.rooms.map((r) => (
                <option key={r.id} value={r.id}>Room {r.room_number}</option>
              ))}
            </select>
            <select
              value={taskType}
              onChange={(e) => setTaskType(e.target.value as HousekeepingTask['task_type'])}
              className="h-9 px-3 text-xs border border-[#D8D1C5] bg-[#FAF9F6]"
            >
              <option value="turnover">Turnover Clean</option>
              <option value="daily_refresh">Daily Refresh</option>
              <option value="deep_clean">Deep Clean</option>
              <option value="inspection">Inspection</option>
            </select>
            <input
              type="text"
              placeholder="Housekeeping notes..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="h-9 px-3 text-xs border border-[#D8D1C5] bg-[#FAF9F6]"
            />
            <button type="submit" className="h-9 bg-[#0D0D0E] text-[#FAF9F6] text-xs font-medium hover:bg-[#24211D]">
              Add to Queue
            </button>
          </div>
        </form>
      ) : null}

      <div className="bg-white border border-[#E5DFD5] overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-[#FAF8F4] border-b border-[#E5DFD5] text-[#5C574F]">
            <tr>
              <th className="py-3 px-4 font-medium">Room</th>
              <th className="py-3 px-4 font-medium">Task Type</th>
              <th className="py-3 px-4 font-medium">Status</th>
              <th className="py-3 px-4 font-medium">Notes</th>
              <th className="py-3 px-4 font-medium">Update</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#F2EDE4]">
            {data.housekeeping.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-8 text-center text-[#6B6459]">
                  No active housekeeping tasks. Tasks are automatically queued on guest check out or added above.
                </td>
              </tr>
            ) : (
              data.housekeeping.map((task) => {
                const room = data.rooms.find((r) => r.id === task.physical_room_id);
                return (
                  <tr key={task.id} className="hover:bg-[#FAF8F4]">
                    <td className="py-3 px-4 font-mono font-medium text-[#171614]">Room {room?.room_number}</td>
                    <td className="py-3 px-4 capitalize text-[#3F3A32]">{task.task_type.replace(/_/g, ' ')}</td>
                    <td className="py-3 px-4 capitalize font-medium text-[#171614]">{task.status.replace(/_/g, ' ')}</td>
                    <td className="py-3 px-4 text-[#5C574F]">{task.notes}</td>
                    <td className="py-3 px-4">
                      {canManage ? (
                        <select
                          aria-label={`Housekeeping status for Room ${room?.room_number}`}
                          value={task.status}
                          onChange={(e) => handleStatusChange(task.id, e.target.value as HousekeepingTask['status'])}
                          className="h-8 px-2 text-xs border border-[#D8D1C5] bg-white"
                        >
                          <option value="pending">Pending</option>
                          <option value="in_progress">In Progress</option>
                          <option value="completed">Completed</option>
                          <option value="inspected">Inspected</option>
                        </select>
                      ) : null}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function MaintenanceModule({
  data,
  role,
  onRefresh,
}: {
  data: AdminSnapshotData;
  role: RoleSlug;
  onRefresh: () => Promise<void>;
}) {
  const canManage = roleHasPermission(role, 'maintenance:manage');
  const [physicalRoomId, setPhysicalRoomId] = useState<string>('');
  const [areaLabel, setAreaLabel] = useState('Guest Room');
  const [title, setTitle] = useState('');
  const [priority, setPriority] = useState<MaintenanceIssue['priority']>('normal');
  const [blocksRoom, setBlocksRoom] = useState(false);

  const handleLogIssue = async (e: React.FormEvent) => {
    e.preventDefault();
    await fetch('/api/admin/maintenance', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        physicalRoomId: physicalRoomId || null,
        areaLabel: physicalRoomId
          ? `Room ${data.rooms.find((r) => r.id === physicalRoomId)?.room_number || ''}`
          : areaLabel,
        title,
        priority,
        blocksRoom,
        status: 'open',
      }),
    });
    setTitle('');
    setBlocksRoom(false);
    await onRefresh();
  };

  const handleResolve = async (issueId: string) => {
    await fetch('/api/admin/maintenance', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: issueId,
        status: 'resolved',
        resolutionNotes: 'Resolved and verified by operations.',
      }),
    });
    await onRefresh();
  };

  return (
    <div className="space-y-6">
      {canManage ? (
        <form onSubmit={handleLogIssue} className="bg-white border border-[#E5DFD5] p-5 space-y-4">
          <h2 className="text-sm font-semibold text-[#171614]">Record Maintenance Issue</h2>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <select
              value={physicalRoomId}
              onChange={(e) => setPhysicalRoomId(e.target.value)}
              className="h-9 px-3 text-xs border border-[#D8D1C5] bg-[#FAF9F6]"
            >
              <option value="">Common Area / Pool / Rooftop</option>
              {data.rooms.map((r) => (
                <option key={r.id} value={r.id}>Room {r.room_number}</option>
              ))}
            </select>
            {!physicalRoomId ? (
              <input
                type="text"
                placeholder="Area (e.g. Swimming Pool, Rooftop)"
                value={areaLabel}
                onChange={(e) => setAreaLabel(e.target.value)}
                className="h-9 px-3 text-xs border border-[#D8D1C5] bg-[#FAF9F6]"
              />
            ) : null}
            <input
              type="text"
              required
              placeholder="Issue description"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="h-9 px-3 text-xs border border-[#D8D1C5] bg-[#FAF9F6]"
            />
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value as MaintenanceIssue['priority'])}
              className="h-9 px-3 text-xs border border-[#D8D1C5] bg-[#FAF9F6]"
            >
              <option value="low">Low Priority</option>
              <option value="normal">Normal Priority</option>
              <option value="high">High Priority</option>
              <option value="urgent">Urgent</option>
            </select>
          </div>
          <div className="flex flex-wrap items-center gap-4">
            {physicalRoomId ? (
              <label className="inline-flex items-center gap-2 text-xs text-[#3F3A32]">
                <input
                  type="checkbox"
                  checked={blocksRoom}
                  onChange={(e) => setBlocksRoom(e.target.checked)}
                />
                <span>Block physical room from booking availability</span>
              </label>
            ) : null}
            <button type="submit" className="bg-[#0D0D0E] text-[#FAF9F6] px-4 py-2 text-xs font-medium hover:bg-[#24211D]">
              Log Issue
            </button>
          </div>
        </form>
      ) : null}

      <div className="bg-white border border-[#E5DFD5] overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-[#FAF8F4] border-b border-[#E5DFD5] text-[#5C574F]">
            <tr>
              <th className="py-3 px-4 font-medium">Area / Room</th>
              <th className="py-3 px-4 font-medium">Issue</th>
              <th className="py-3 px-4 font-medium">Priority</th>
              <th className="py-3 px-4 font-medium">Blocks Booking</th>
              <th className="py-3 px-4 font-medium">Status</th>
              <th className="py-3 px-4 font-medium">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#F2EDE4]">
            {data.maintenance.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-8 text-center text-[#6B6459]">
                  No maintenance tickets logged.
                </td>
              </tr>
            ) : (
              data.maintenance.map((issue) => (
                <tr key={issue.id} className="hover:bg-[#FAF8F4]">
                  <td className="py-3 px-4 font-medium text-[#171614]">{issue.area_label}</td>
                  <td className="py-3 px-4 text-[#3F3A32]">{issue.title}</td>
                  <td className="py-3 px-4 capitalize text-[#3F3A32]">{issue.priority}</td>
                  <td className="py-3 px-4 text-[#5C574F]">{issue.blocks_room ? 'Yes (Blocked)' : 'No'}</td>
                  <td className="py-3 px-4 capitalize text-[#171614]">{issue.status.replace(/_/g, ' ')}</td>
                  <td className="py-3 px-4">
                    {canManage && issue.status !== 'resolved' ? (
                      <button
                        type="button"
                        onClick={() => handleResolve(issue.id)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-800 text-white text-[11px] hover:bg-emerald-900 whitespace-nowrap"
                      >
                        <RefreshCw className="w-3 h-3" aria-hidden="true" />
                        <span>Mark Resolved</span>
                      </button>
                    ) : (
                      <span className="text-[#6B6459]">Closed</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

async function optimizeImageForUpload(source: File): Promise<File> {
  if (!source.type.startsWith('image/') || source.size <= 350 * 1024) {
    return source;
  }

  return new Promise((resolve) => {
    const objectUrl = URL.createObjectURL(source);
    const img = new window.Image();

    img.onload = () => {
      try {
        const maxDim = 1600;
        const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
        const targetW = Math.max(1, Math.round(img.width * scale));
        const targetH = Math.max(1, Math.round(img.height * scale));

        const canvas = document.createElement('canvas');
        canvas.width = targetW;
        canvas.height = targetH;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          URL.revokeObjectURL(objectUrl);
          resolve(source);
          return;
        }
        ctx.drawImage(img, 0, 0, targetW, targetH);

        canvas.toBlob(
          (blob) => {
            URL.revokeObjectURL(objectUrl);
            if (!blob || blob.size >= source.size) {
              resolve(source);
              return;
            }
            const baseName = source.name.replace(/\.[^.]+$/, '');
            resolve(new File([blob], `${baseName}.webp`, { type: 'image/webp' }));
          },
          'image/webp',
          0.84
        );
      } catch {
        URL.revokeObjectURL(objectUrl);
        resolve(source);
      }
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(source);
    };

    img.src = objectUrl;
  });
}

export function MediaManagementModule({
  data,
  role,
  onRefresh,
}: {
  data: AdminSnapshotData;
  role: RoleSlug;
  onRefresh: () => Promise<void>;
}) {
  const canManage = roleHasPermission(role, 'media:manage');
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [altText, setAltText] = useState('');
  const [sectionKey, setSectionKey] = useState<MediaAsset['section_key']>('hero');
  const [filterSection, setFilterSection] = useState<string>('all');
  const [driveFileId, setDriveFileId] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [error, setError] = useState('');

  const filteredMedia =
    filterSection === 'all'
      ? data.media
      : data.media.filter((m) => m.section_key === filterSection);

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;
    setUploading(true);
    setUploadProgress(0);
    setError('');
    try {
      const preparedFile = await optimizeImageForUpload(file);
      const fd = new FormData();
      fd.append('file', preparedFile);
      fd.append('title', title);
      fd.append('alt_text', altText);
      fd.append('section_key', sectionKey);
      if (driveFileId) fd.append('drive_file_id', driveFileId);

      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('POST', '/api/admin/media');
        xhr.upload.onprogress = (evt) => {
          if (evt.lengthComputable) {
            setUploadProgress(Math.round((evt.loaded / evt.total) * 100));
          }
        };
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve();
          } else {
            try {
              const parsed = JSON.parse(xhr.responseText);
              reject(new Error(parsed.error || 'Upload failed.'));
            } catch {
              reject(new Error('Upload failed.'));
            }
          }
        };
        xhr.onerror = () => reject(new Error('Network error during media upload.'));
        xhr.send(fd);
      });

      setFile(null);
      setTitle('');
      setAltText('');
      setDriveFileId('');
      await onRefresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error during media upload.');
    } finally {
      setUploading(false);
      setUploadProgress(null);
    }
  };

  const handleDelete = async (id: string) => {
    await fetch(`/api/admin/media?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
    await onRefresh();
  };

  return (
    <div className="space-y-6">
      <div className="bg-[#FAF6EE] border border-[#E2D5BE] p-4 text-xs text-[#3F3A32] leading-relaxed">
        <p className="font-semibold text-[#171614]">Authentic Hotel Media Library</p>
        <p className="mt-1">
          Upload authentic Charlees Hotel &amp; Suites photographs and clean MP4/WebM videos below to manage website galleries. Images over 350KB are automatically compressed to WebP before transfer.
        </p>
      </div>

      {canManage ? (
        <form onSubmit={handleUpload} className="bg-white border border-[#E5DFD5] p-5 space-y-4">
          <h2 className="text-sm font-semibold text-[#171614]">Upload Hotel Media Asset</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <input
              type="file"
              required
              accept="image/jpeg,image/png,image/webp,image/avif,video/mp4,video/webm"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              className="text-xs border border-[#D8D1C5] p-2 bg-[#FAF9F6]"
            />
            <select
              value={sectionKey}
              onChange={(e) => setSectionKey(e.target.value as MediaAsset['section_key'])}
              className="h-10 px-3 text-xs border border-[#D8D1C5] bg-[#FAF9F6]"
            >
              <option value="logo">Official Brand Logo</option>
              <option value="hero">Homepage Hero</option>
              <option value="exterior">White Building Exterior</option>
              <option value="room_standard">Standard Room</option>
              <option value="room_twin">Twin Room</option>
              <option value="room_deluxe">Deluxe Room</option>
              <option value="room_luxury">Luxury Room</option>
              <option value="pool">Swimming Pool</option>
              <option value="rooftop">Rooftop Lounge</option>
              <option value="dining">Dining Space</option>
              <option value="exp_river_ethiope">Experience · River Ethiope</option>
              <option value="exp_abraka_market">Experience · Abraka Market</option>
              <option value="exp_abraka_top">Experience · Abraka Top</option>
              <option value="gallery">General Gallery</option>
            </select>
            <input
              type="text"
              required
              placeholder="Media Title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="h-10 px-3 text-xs border border-[#D8D1C5] bg-[#FAF9F6]"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input
              type="text"
              required
              placeholder="Descriptive Alternative Text (Accessibility & SEO)"
              value={altText}
              onChange={(e) => setAltText(e.target.value)}
              className="h-10 px-3 text-xs border border-[#D8D1C5] bg-[#FAF9F6]"
            />
            <input
              type="text"
              placeholder="Source Google Drive File ID (Optional)"
              value={driveFileId}
              onChange={(e) => setDriveFileId(e.target.value)}
              className="h-10 px-3 text-xs border border-[#D8D1C5] bg-[#FAF9F6] font-mono"
            />
          </div>
          {error ? <p className="text-xs text-red-700">{error}</p> : null}
          <div className="flex flex-wrap items-center gap-4">
            <button
              type="submit"
              disabled={uploading}
              className="inline-flex items-center gap-2 bg-[#0D0D0E] text-[#FAF9F6] px-5 py-2.5 text-xs font-medium hover:bg-[#24211D] disabled:opacity-60"
            >
              <Upload className="w-3.5 h-3.5" aria-hidden="true" />
              <span>
                {uploading
                  ? uploadProgress !== null
                    ? `Uploading ${uploadProgress}%...`
                    : 'Preparing...'
                  : 'Publish Media Asset'}
              </span>
            </button>
            {uploading && uploadProgress !== null ? (
              <progress
                value={uploadProgress}
                max={100}
                className="flex-1 max-w-xs h-2 bg-[#EAE4D9] [&::-webkit-progress-bar]:bg-[#EAE4D9] [&::-webkit-progress-value]:bg-[#0D0D0E]"
              />
            ) : null}
          </div>
        </form>
      ) : null}

      <div className="bg-white border border-[#E5DFD5] p-4 flex items-center justify-between gap-4">
        <span className="text-xs text-[#5C574F] font-mono tabular-nums">
          Showing {filteredMedia.length} of {data.media.length} assets
        </span>
        <select
          aria-label="Filter media by section"
          value={filterSection}
          onChange={(e) => setFilterSection(e.target.value)}
          className="h-9 px-3 text-xs border border-[#D8D1C5] bg-[#FAF9F6]"
        >
          <option value="all">All Sections</option>
          <option value="hero">Homepage Hero</option>
          <option value="exterior">Exterior</option>
          <option value="room_standard">Standard Room</option>
          <option value="room_twin">Twin Room</option>
          <option value="room_deluxe">Deluxe Room</option>
          <option value="room_luxury">Luxury Room</option>
          <option value="pool">Swimming Pool</option>
          <option value="rooftop">Rooftop Lounge</option>
          <option value="dining">Dining Space</option>
          <option value="exp_river_ethiope">Experience · River Ethiope</option>
          <option value="exp_abraka_market">Experience · Abraka Market</option>
          <option value="exp_abraka_top">Experience · Abraka Top</option>
          <option value="gallery">General Gallery</option>
        </select>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredMedia.length === 0 ? (
          <div className="col-span-full bg-white border border-[#E5DFD5] p-8 text-center text-xs text-[#6B6459]">
            No media files match this section.
          </div>
        ) : (
          filteredMedia.map((asset) => (
            <div key={asset.id} className="bg-white border border-[#E5DFD5] p-3 space-y-2">
              <div className="relative aspect-[4/3] bg-[#EAE4D9] overflow-hidden">
                {asset.media_type === 'video' ? (
                  <video src={asset.public_url} controls className="w-full h-full object-cover" />
                ) : (
                  <Image
                    src={asset.public_url}
                    alt={asset.alt_text}
                    fill
                    className="object-cover"
                    referrerPolicy="no-referrer"
                  />
                )}
              </div>
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-[#171614] truncate">{asset.title}</p>
                  <p className="text-[11px] font-mono text-[#6B6459]">{asset.section_key}</p>
                </div>
                {canManage ? (
                  <button
                    type="button"
                    onClick={() => handleDelete(asset.id)}
                    className="p-1.5 text-red-700 hover:bg-red-50 shrink-0"
                    aria-label={`Delete ${asset.title}`}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                ) : null}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
