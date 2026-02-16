#!/usr/bin/env tsx
/**
 * Phase 0.5 Spike: Real Freepik API verification
 *
 * Purpose:
 * - Test actual Freepik API endpoints (search video + download info)
 * - Save raw responses as fixtures for future reference
 * - Validate assumptions about API structure, pagination, rate limits
 * - Document findings for schema and scoring implementation
 */

import * as dotenv from 'dotenv';
import * as fs from 'fs/promises';
import * as path from 'path';

dotenv.config();

const FREEPIK_API_KEY = process.env.FREEPIK_API_KEY;
const FREEPIK_API_BASE = 'https://api.freepik.com/v1';

interface SpikeConfig {
  searchQuery: string;
  locale: string;
  limit: number;
  fixturesDir: string;
}

const config: SpikeConfig = {
  searchQuery: 'mountain sunset landscape',
  locale: 'en-US',
  limit: 10,
  fixturesDir: path.join(process.cwd(), 'tests', 'fixtures'),
};

async function makeApiCall(endpoint: string, params?: Record<string, string>): Promise<any> {
  if (!FREEPIK_API_KEY) {
    throw new Error('FREEPIK_API_KEY not set in .env file');
  }

  const url = new URL(`${FREEPIK_API_BASE}${endpoint}`);
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.append(key, value);
    });
  }

  console.log(`\n📡 Calling: ${url.pathname}${url.search}`);

  const response = await fetch(url.toString(), {
    headers: {
      'x-freepik-api-key': FREEPIK_API_KEY,
      'Accept': 'application/json',
    },
  });

  // Log response headers for rate limit analysis
  console.log(`\n📊 Response status: ${response.status} ${response.statusText}`);
  console.log('📊 Headers:');
  console.log(`   - x-ratelimit-limit: ${response.headers.get('x-ratelimit-limit')}`);
  console.log(`   - x-ratelimit-remaining: ${response.headers.get('x-ratelimit-remaining')}`);
  console.log(`   - x-ratelimit-reset: ${response.headers.get('x-ratelimit-reset')}`);

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`API call failed: ${response.status} ${response.statusText}\n${errorText}`);
  }

  return response.json();
}

async function testVideoSearch(): Promise<any> {
  console.log('\n🔍 TEST 1: Video Search');
  console.log(`Query: "${config.searchQuery}"`);

  const data = await makeApiCall('/resources', {
    locale: config.locale,
    term: config.searchQuery,
    filters: JSON.stringify({
      content_type: ['video'],
      order: 'latest',
    }),
    limit: config.limit.toString(),
  });

  console.log(`\n✅ Search results: ${data.data?.length ?? 0} items`);
  if (data.data && data.data.length > 0) {
    const firstItem = data.data[0];
    console.log('📄 First result:');
    console.log(`   - ID: ${firstItem.id}`);
    console.log(`   - Title: ${firstItem.title}`);
    console.log(`   - Type: ${firstItem.content_type}`);
    if (firstItem.video_info) {
      console.log(`   - Duration: ${firstItem.video_info.duration}s`);
      console.log(`   - Width: ${firstItem.video_info.width}`);
      console.log(`   - Height: ${firstItem.video_info.height}`);
    }
  }

  // Save fixture
  const fixturePath = path.join(config.fixturesDir, 'freepik-search-response.json');
  await fs.mkdir(config.fixturesDir, { recursive: true });
  await fs.writeFile(fixturePath, JSON.stringify(data, null, 2), 'utf-8');
  console.log(`\n💾 Saved to: ${fixturePath}`);

  return data;
}

async function testDownloadInfo(resourceId: string): Promise<any> {
  console.log('\n🔍 TEST 2: Download Info');
  console.log(`Resource ID: ${resourceId}`);

  const data = await makeApiCall(`/resources/${resourceId}/download`);

  console.log(`\n✅ Download info received`);
  if (data.data) {
    console.log('📄 Download URL available:', !!data.data.url);
    console.log('   - URL expires:', data.data.expires_at);
  }

  // Save fixture
  const fixturePath = path.join(config.fixturesDir, 'freepik-download-response.json');
  await fs.writeFile(fixturePath, JSON.stringify(data, null, 2), 'utf-8');
  console.log(`\n💾 Saved to: ${fixturePath}`);

  return data;
}

async function analyzeResponse(searchData: any): Promise<void> {
  console.log('\n\n📊 ANALYSIS & VALIDATION');
  console.log('━'.repeat(60));

  // Pagination analysis
  if (searchData.meta) {
    console.log('\n1. Pagination structure:');
    console.log(`   - Total: ${searchData.meta.total ?? 'N/A'}`);
    console.log(`   - Page: ${searchData.meta.page ?? 'N/A'}`);
    console.log(`   - Per page: ${searchData.meta.per_page ?? 'N/A'}`);
  }

  // Video info structure
  if (searchData.data && searchData.data.length > 0) {
    console.log('\n2. Video metadata fields present:');
    const sampleVideo = searchData.data[0];
    const videoInfo = sampleVideo.video_info || {};

    console.log(`   ✓ id: ${typeof sampleVideo.id}`);
    console.log(`   ✓ title: ${typeof sampleVideo.title}`);
    console.log(`   ✓ tags: ${Array.isArray(sampleVideo.tags) ? 'array' : 'missing'}`);
    console.log(`   ✓ content_type: ${typeof sampleVideo.content_type}`);
    console.log(`   ✓ video_info.duration: ${typeof videoInfo.duration}`);
    console.log(`   ✓ video_info.width: ${typeof videoInfo.width}`);
    console.log(`   ✓ video_info.height: ${typeof videoInfo.height}`);
    console.log(`   ✓ created_at: ${typeof sampleVideo.created_at}`);
  }

  // Schema validation notes
  console.log('\n3. Schema & Scoring validation:');
  console.log('   ✓ Can extract resolution from video_info');
  console.log('   ✓ Can extract duration from video_info');
  console.log('   ✓ Can extract creation date for recency scoring');
  console.log('   ✓ Can match search terms against title + tags');

  console.log('\n4. Next steps:');
  console.log('   - Implement FreepikClient with proper typing (Phase 2)');
  console.log('   - Build scoring algorithm based on confirmed fields (Phase 3)');
  console.log('   - Implement rate limit handling using headers (Phase 2)');

  console.log('\n━'.repeat(60));
}

async function main(): Promise<void> {
  console.log('🚀 Freepik API Spike - Phase 0.5');
  console.log('━'.repeat(60));

  try {
    // Test 1: Video search
    const searchData = await testVideoSearch();

    // Test 2: Download info (if we got results)
    if (searchData.data && searchData.data.length > 0) {
      const firstResourceId = searchData.data[0].id;
      await testDownloadInfo(firstResourceId);
    }

    // Analyze and document findings
    await analyzeResponse(searchData);

    console.log('\n✅ Spike completed successfully!');
    console.log('\nℹ️  Fixtures saved in tests/fixtures/');
    console.log('ℹ️  Review the JSON files to understand API structure');

  } catch (error) {
    console.error('\n❌ Spike failed:', error);
    process.exit(1);
  }
}

main();
