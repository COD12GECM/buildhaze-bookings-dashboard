import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import mongoose from 'mongoose';

export async function GET() {
  try {
    await connectDB();
    
    // Ping database
    await mongoose.connection.db?.admin().ping();

    return NextResponse.json({
      status: 'ok',
      database: 'connected',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
    });
  } catch (error) {
    console.error('Health check failed:', error);
    return NextResponse.json({
      status: 'error',
      database: 'disconnected',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 503 });
  }
}
