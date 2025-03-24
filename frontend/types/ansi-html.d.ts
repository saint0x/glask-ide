declare module 'ansi-html' {
  interface AnsiHTMLColors {
    reset: [string, string]
    black: string
    red: string
    green: string
    yellow: string
    blue: string
    magenta: string
    cyan: string
    lightgrey: string
    darkgrey: string
  }

  interface AnsiHTML {
    setColors: (colors: AnsiHTMLColors) => void
    (text: string): string
  }

  const ansiHTML: AnsiHTML
  export default ansiHTML
} 