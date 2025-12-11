import { NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

export async function GET() {
  try {
    const puzzleImagesDir = path.join(process.cwd(), 'public', 'puzzle-images')

    if (!fs.existsSync(puzzleImagesDir)) {
      return NextResponse.json({ images: [] })
    }

    const files = fs.readdirSync(puzzleImagesDir)

    const imageFiles = files
      .filter(file => /\.(png|jpg|jpeg|webp)$/i.test(file))
      .map(file => `/puzzle-images/${file}`)
      .sort((a, b) => {
        const numA = parseInt(a.match(/(\d+)/)?.[1] || '0')
        const numB = parseInt(b.match(/(\d+)/)?.[1] || '0')
        return numA - numB
      })

    return NextResponse.json({ images: imageFiles })
  } catch (error) {
    return NextResponse.json({ images: [] })
  }
}
