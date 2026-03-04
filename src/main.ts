import './style.css'
import { registerSW } from 'virtual:pwa-register'

if (import.meta.env.PROD) {
  registerSW({ immediate: true })
} else if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then((registrations) => {
    registrations.forEach((registration) => {
      registration.unregister()
    })
  })
}

document.querySelector<HTMLDivElement>('#app')!.innerHTML = `
  <div id="catCanvas" class="cat-canvas" aria-hidden="true"></div>
  <main class="app-shell">
    <button id="snapButton" class="snap-button" type="button" aria-label="Snap button">
      <span class="snap-rim"></span>
      <span class="snap-core"></span>
      <span class="snap-gloss"></span>
      <span class="snap-spark sparkle-a"></span>
      <span class="snap-spark sparkle-b"></span>
      <span class="snap-spark sparkle-c"></span>
      <img id="snapIcon" class="snap-icon" src="/snap.png" alt="Snap icon" />
    </button>
  </main>
`

const catCanvas = document.querySelector<HTMLDivElement>('#catCanvas')
const snapButton = document.querySelector<HTMLButtonElement>('#snapButton')
const snapIcon = document.querySelector<HTMLImageElement>('#snapIcon')
const catImagePath = '/cat.png'
const maxCats = 15
const soundPool = [
  { src: '/snap1.mp3', weight: 1, audio: new Audio('/snap1.mp3') },
  { src: '/snap2.mp3', weight: 1, audio: new Audio('/snap2.mp3') },
  { src: '/snap3.mp3', weight: 1, audio: new Audio('/snap3.mp3') },
  { src: '/snap4.mp3', weight: 1, audio: new Audio('/snap4.mp3') },
  { src: '/meaow.mp3', weight: 0.3, audio: new Audio('/meaow.mp3') },
]

soundPool.forEach(({ audio }) => {
  audio.preload = 'auto'
})

if (!catCanvas || !snapButton || !snapIcon) {
  throw new Error('Snap button UI did not initialize.')
}

snapIcon.addEventListener('error', () => {
  console.error('Could not load /public/snap.png')
})

const resetTilt = () => {
  snapButton.style.setProperty('--tilt-x', '0deg')
  snapButton.style.setProperty('--tilt-y', '0deg')
}

const updateTilt = (event: PointerEvent) => {
  const rect = snapButton.getBoundingClientRect()
  const px = (event.clientX - rect.left) / rect.width
  const py = (event.clientY - rect.top) / rect.height
  const tiltY = (px - 0.5) * 16
  const tiltX = (0.5 - py) * 16
  snapButton.style.setProperty('--tilt-x', `${tiltX.toFixed(2)}deg`)
  snapButton.style.setProperty('--tilt-y', `${tiltY.toFixed(2)}deg`)
}

const animateSnap = () => {
  snapButton.classList.add('is-snapped')
  window.setTimeout(() => {
    snapButton.classList.remove('is-snapped')
  }, 280)
}

const spawnRandomCat = () => {
  const buttonRect = snapButton.getBoundingClientRect()
  const catSize = Math.max(48, Math.round(Math.min(buttonRect.width, buttonRect.height) * 0.5))
  const maxLeft = Math.max(0, window.innerWidth - catSize)
  const maxTop = Math.max(0, window.innerHeight - catSize)

  const exclusionPadding = 24
  const exclusionZone = {
    left: buttonRect.left - exclusionPadding,
    top: buttonRect.top - exclusionPadding,
    right: buttonRect.right + exclusionPadding,
    bottom: buttonRect.bottom + exclusionPadding,
  }

  const intersectsExclusionZone = (left: number, top: number) => {
    const right = left + catSize
    const bottom = top + catSize
    return !(
      right < exclusionZone.left ||
      left > exclusionZone.right ||
      bottom < exclusionZone.top ||
      top > exclusionZone.bottom
    )
  }

  let randomLeft = 0
  let randomTop = 0
  let foundValidSpot = false

  for (let attempt = 0; attempt < 30; attempt += 1) {
    const nextLeft = Math.random() * maxLeft
    const nextTop = Math.random() * maxTop
    if (!intersectsExclusionZone(nextLeft, nextTop)) {
      randomLeft = nextLeft
      randomTop = nextTop
      foundValidSpot = true
      break
    }
  }

  if (!foundValidSpot) {
    return
  }

  const cat = document.createElement('img')
  cat.src = catImagePath
  cat.alt = ''
  cat.className = 'cat-sprite'
  cat.style.width = `${catSize}px`
  cat.style.height = `${catSize}px`
  cat.style.left = `${randomLeft}px`
  cat.style.top = `${randomTop}px`
  cat.style.transform = `rotate(${(Math.random() - 0.5) * 10}deg)`

  catCanvas.appendChild(cat)

  while (catCanvas.children.length > maxCats) {
    catCanvas.firstElementChild?.remove()
  }
}

const pickRandomSound = () => {
  const totalWeight = soundPool.reduce((sum, item) => sum + item.weight, 0)
  let pick = Math.random() * totalWeight

  for (const item of soundPool) {
    pick -= item.weight
    if (pick <= 0) {
      return item
    }
  }

  return soundPool[soundPool.length - 1]
}

const playSnapSound = () => {
  const chosenSound = pickRandomSound()
  chosenSound.audio.currentTime = 0
  if (chosenSound.src === '/meaow.mp3') {
    spawnRandomCat()
  }
  chosenSound.audio.play().catch(() => {
    console.error(`Could not play ${chosenSound.src}`)
  })
}

snapButton.addEventListener('pointermove', updateTilt)
snapButton.addEventListener('pointerenter', updateTilt)
snapButton.addEventListener('pointerleave', () => {
  resetTilt()
  snapButton.classList.remove('is-pressed')
})

snapButton.addEventListener('pointerdown', () => {
  snapButton.classList.add('is-pressed')
  playSnapSound()
})

snapButton.addEventListener('pointerup', () => {
  snapButton.classList.remove('is-pressed')
  if ('vibrate' in navigator) {
    navigator.vibrate(16)
  }
  animateSnap()
})
