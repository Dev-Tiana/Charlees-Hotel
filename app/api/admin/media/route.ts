import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { requireStaffPermission } from '@/lib/auth/session';
import { addMediaAssetAdmin, deleteMediaAssetAdmin } from '@/lib/db/store';
import { createSupabaseAdminClient, isSupabaseConfigured } from '@/lib/supabase/server';
import { MediaAsset } from '@/lib/types';

const ALLOWED_IMAGE_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/avif',
]);
const ALLOWED_VIDEO_TYPES = new Set(['video/mp4', 'video/webm']);
const ALLOWED_SECTIONS = new Set<MediaAsset['section_key']>([
  'logo',
  'hero',
  'exterior',
  'room_standard',
  'room_twin',
  'room_deluxe',
  'room_luxury',
  'pool',
  'rooftop',
  'dining',
  'abraka',
  'gallery',
]);

export async function POST(req: NextRequest) {
  try {
    const session = await requireStaffPermission(req, 'media:manage');
    const formData = await req.formData();

    const file = formData.get('file') as File | null;
    const title = String(formData.get('title') || '').trim();
    const altText = String(formData.get('alt_text') || '').trim();
    const sectionKey = String(formData.get('section_key') || 'gallery') as MediaAsset['section_key'];
    const categorySlug = String(formData.get('category_slug') || '').trim() || null;
    const driveFileId = String(formData.get('drive_file_id') || '').trim() || null;

    if (!file || !title || !altText) {
      return NextResponse.json(
        { error: 'File, title, and descriptive alternative text are required.' },
        { status: 400 }
      );
    }

    if (!ALLOWED_SECTIONS.has(sectionKey)) {
      return NextResponse.json({ error: 'Invalid website section selected.' }, { status: 400 });
    }

    const isImage = ALLOWED_IMAGE_TYPES.has(file.type);
    const isVideo = ALLOWED_VIDEO_TYPES.has(file.type);
    if (!isImage && !isVideo) {
      return NextResponse.json(
        { error: 'Only JPEG, PNG, WebP, AVIF images and MP4/WebM videos are permitted.' },
        { status: 400 }
      );
    }

    if (file.size > 25 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'Media file exceeds the 25MB upload limit.' },
        { status: 400 }
      );
    }

    const ext = path.extname(file.name).replace(/[^a-zA-Z0-9.]/g, '') || (isImage ? '.jpg' : '.mp4');
    const safeName = `${sectionKey}-${Date.now()}-${crypto.randomBytes(4).toString('hex')}${ext}`;
    const bytes = Buffer.from(await file.arrayBuffer());

    let publicUrl = '';
    let storagePath = '';

    if (isSupabaseConfigured()) {
      const sb = createSupabaseAdminClient()!;
      storagePath = `charlees/${safeName}`;
      const { error: uploadErr } = await sb.storage
        .from('hotel-media')
        .upload(storagePath, bytes, { contentType: file.type, upsert: false });
      if (uploadErr) {
        throw new Error(`Supabase Storage upload failed: ${uploadErr.message}`);
      }
      const { data: urlData } = sb.storage.from('hotel-media').getPublicUrl(storagePath);
      publicUrl = urlData.publicUrl;
    } else {
      const uploadDir = path.resolve(process.cwd(), 'public', 'uploads');
      await fs.mkdir(uploadDir, { recursive: true });
      const resolvedPath = path.resolve(uploadDir, safeName);
      if (!resolvedPath.startsWith(uploadDir + path.sep)) {
        return NextResponse.json({ error: 'Invalid storage path.' }, { status: 400 });
      }
      await fs.writeFile(resolvedPath, bytes);
      storagePath = `/uploads/${safeName}`;
      publicUrl = `/uploads/${safeName}`;
    }

    const asset = await addMediaAssetAdmin({
      title,
      alt_text: altText,
      media_type: isImage ? 'image' : 'video',
      section_key: sectionKey,
      category_slug: categorySlug,
      storage_path: storagePath,
      public_url: publicUrl,
      drive_file_id: driveFileId,
      actor: {
        userId: session.userId,
        staffId: session.staffId,
        email: session.email,
        role: session.role,
      },
    });

    return NextResponse.json({ ok: true, asset }, { status: 201 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Media upload failed.';
    const status = msg === 'UNAUTHORIZED' ? 401 : msg === 'FORBIDDEN' ? 403 : 400;
    return NextResponse.json({ error: msg }, { status });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await requireStaffPermission(req, 'media:manage');
    const id = req.nextUrl.searchParams.get('id') || '';
    if (!id) {
      return NextResponse.json({ error: 'Media asset ID is required.' }, { status: 400 });
    }
    await deleteMediaAssetAdmin({
      id,
      actor: { userId: session.userId, email: session.email, role: session.role },
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unable to delete media.';
    const status = msg === 'UNAUTHORIZED' ? 401 : msg === 'FORBIDDEN' ? 403 : 400;
    return NextResponse.json({ error: msg }, { status });
  }
}
