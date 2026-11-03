/** In-place radix-2 FFT. `real` and `imag` must share a power-of-two length. */
export function fft(real: Float64Array, imag: Float64Array): void {
  const n = real.length;
  for (let index = 1, reversed = 0; index < n; index += 1) {
    let bit = n >> 1;
    for (; reversed & bit; bit >>= 1) reversed ^= bit;
    reversed ^= bit;
    if (index < reversed) {
      const swapReal = real[index] ?? 0;
      real[index] = real[reversed] ?? 0;
      real[reversed] = swapReal;
      const swapImag = imag[index] ?? 0;
      imag[index] = imag[reversed] ?? 0;
      imag[reversed] = swapImag;
    }
  }

  for (let length = 2; length <= n; length <<= 1) {
    const angle = (-2 * Math.PI) / length;
    const stepReal = Math.cos(angle);
    const stepImag = Math.sin(angle);
    const half = length >> 1;
    for (let start = 0; start < n; start += length) {
      let twiddleReal = 1;
      let twiddleImag = 0;
      for (let offset = 0; offset < half; offset += 1) {
        const even = start + offset;
        const odd = even + half;
        const oddReal = real[odd] ?? 0;
        const oddImag = imag[odd] ?? 0;
        const mixedReal = oddReal * twiddleReal - oddImag * twiddleImag;
        const mixedImag = oddReal * twiddleImag + oddImag * twiddleReal;
        const evenReal = real[even] ?? 0;
        const evenImag = imag[even] ?? 0;
        real[even] = evenReal + mixedReal;
        imag[even] = evenImag + mixedImag;
        real[odd] = evenReal - mixedReal;
        imag[odd] = evenImag - mixedImag;
        const nextReal = twiddleReal * stepReal - twiddleImag * stepImag;
        twiddleImag = twiddleReal * stepImag + twiddleImag * stepReal;
        twiddleReal = nextReal;
      }
    }
  }
}
