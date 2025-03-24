import Prism from 'prismjs'
import 'prismjs/components/prism-core'

// Import themes
import 'prismjs/themes/prism.css'
import 'prismjs/themes/prism-dark.css'

// Load core languages
import 'prismjs/components/prism-markup'
import 'prismjs/components/prism-css'
import 'prismjs/components/prism-clike'
import 'prismjs/components/prism-javascript'
import 'prismjs/components/prism-typescript'
import 'prismjs/components/prism-jsx'
import 'prismjs/components/prism-tsx'
import 'prismjs/components/prism-markdown'
import 'prismjs/components/prism-python'
import 'prismjs/components/prism-java'
import 'prismjs/components/prism-c'
import 'prismjs/components/prism-cpp'
import 'prismjs/components/prism-csharp'
import 'prismjs/components/prism-go'
import 'prismjs/components/prism-rust'
import 'prismjs/components/prism-ruby'
import 'prismjs/components/prism-php'
import 'prismjs/components/prism-sql'
import 'prismjs/components/prism-bash'
import 'prismjs/components/prism-json'
import 'prismjs/components/prism-yaml'

import prettier from 'prettier'

// Language map for file extensions
const languageMap: Record<string, string> = {
  // JavaScript & TypeScript
  'js': 'javascript',
  'jsx': 'jsx',
  'mjs': 'javascript',
  'cjs': 'javascript',
  'ts': 'typescript',
  'tsx': 'tsx',
  'd.ts': 'typescript',
  
  // Web
  'html': 'markup',
  'htm': 'markup',
  'xml': 'markup',
  'svg': 'markup',
  'css': 'css',
  'scss': 'css',
  'sass': 'css',
  'less': 'css',
  
  // Documentation
  'md': 'markdown',
  'mdx': 'markdown',
  'markdown': 'markdown',
  
  // Data & Config
  'json': 'json',
  'jsonc': 'json',
  'yaml': 'yaml',
  'yml': 'yaml',
  
  // Programming Languages
  'py': 'python',
  'java': 'java',
  'c': 'c',
  'h': 'c',
  'cpp': 'cpp',
  'hpp': 'cpp',
  'cs': 'csharp',
  'go': 'go',
  'rs': 'rust',
  'rb': 'ruby',
  'php': 'php',
  
  // Database & Query
  'sql': 'sql',
  
  // Shell & Scripts
  'sh': 'bash',
  'bash': 'bash',
  'zsh': 'bash'
}

// Create a .prettierrc configuration
const prettierConfig = {
  semi: true,
  singleQuote: true,
  trailingComma: 'es5' as const,
  printWidth: 100,
  tabWidth: 2,
  endOfLine: 'lf' as const,
  embeddedLanguageFormatting: 'auto' as const
}

/**
 * Get the language for syntax highlighting based on file extension
 */
export function getLanguageFromPath(path: string): string {
  const extension = path.split('.').pop()?.toLowerCase() || ''
  return languageMap[extension] || 'plaintext'
}

/**
 * Highlight code using Prism.js
 */
export function highlightCode(code: string, language: string): string {
  try {
    // Default to plaintext if language not supported
    const lang = Prism.languages[language] ? language : 'plaintext'
    
    // Ensure we have valid input
    if (!code) return ''
    
    // Highlight the code
    const highlighted = Prism.highlight(
      code,
      Prism.languages[lang] || Prism.languages.plaintext,
      lang
    )
    
    return highlighted
  } catch (err) {
    console.error('Error highlighting code:', err)
    return code // Return original code if highlighting fails
  }
}

/**
 * Format code using Prettier
 */
export async function formatCode(code: string, language: string): Promise<string> {
  try {
    // Map language to parser
    let parser: prettier.BuiltInParserName | undefined
    let options: prettier.Options = { ...prettierConfig }

    switch (language) {
      case 'javascript':
      case 'jsx':
        parser = 'babel'
        break
      case 'typescript':
      case 'tsx':
        parser = 'typescript'
        break
      case 'css':
      case 'scss':
      case 'less':
        parser = 'css'
        break
      case 'markup':
      case 'html':
      case 'xml':
        parser = 'html'
        break
      case 'markdown':
      case 'md':
        parser = 'markdown'
        options = {
          ...options,
          proseWrap: 'always' as const,
        }
        break
      case 'yaml':
      case 'yml':
        parser = 'yaml'
        break
      case 'json':
      case 'jsonc':
        options = {
          ...options,
          trailingComma: 'none' as const, // JSON doesn't support trailing commas
        }
        parser = 'json'
        break
      default:
        return code // Return unformatted if no parser available
    }

    if (!parser) {
      return code
    }

    // Format the code using Prettier's standalone API
    const formatted = await prettier.format(code, {
      ...options,
      parser,
    })

    return formatted
  } catch (err) {
    console.error('Error formatting code:', err)
    // Log more details about the error
    if (err instanceof Error) {
      console.error('Prettier error details:', {
        message: err.message,
        stack: err.stack,
        language,
        codeLength: code.length
      })
    }
    return code
  }
}

/**
 * Get theme styles for syntax highlighting
 */
export function getThemeStyles(isDark: boolean = true): string {
  return isDark ? 
    // VS Code Dark Theme
    `
    .token.comment,
    .token.prolog,
    .token.doctype,
    .token.cdata {
      color: #6A9955;
    }
    
    .token.punctuation {
      color: #D4D4D4;
    }
    
    .token.property,
    .token.tag,
    .token.boolean,
    .token.number,
    .token.constant,
    .token.symbol,
    .token.deleted {
      color: #B5CEA8;
    }
    
    .token.selector,
    .token.attr-name,
    .token.string,
    .token.char,
    .token.builtin,
    .token.inserted {
      color: #CE9178;
    }
    
    .token.operator,
    .token.entity,
    .token.url,
    .language-css .token.string,
    .style .token.string {
      color: #D4D4D4;
    }
    
    .token.atrule,
    .token.attr-value,
    .token.keyword {
      color: #C586C0;
    }
    
    .token.function,
    .token.class-name {
      color: #DCDCAA;
    }
    
    .token.regex,
    .token.important,
    .token.variable {
      color: #9CDCFE;
    }
    ` :
    // Light Theme
    `
    .token.comment,
    .token.prolog,
    .token.doctype,
    .token.cdata {
      color: #008000;
    }
    
    .token.punctuation {
      color: #000000;
    }
    
    .token.property,
    .token.tag,
    .token.boolean,
    .token.number,
    .token.constant,
    .token.symbol,
    .token.deleted {
      color: #098658;
    }
    
    .token.selector,
    .token.attr-name,
    .token.string,
    .token.char,
    .token.builtin,
    .token.inserted {
      color: #A31515;
    }
    
    .token.operator,
    .token.entity,
    .token.url,
    .language-css .token.string,
    .style .token.string {
      color: #000000;
    }
    
    .token.atrule,
    .token.attr-value,
    .token.keyword {
      color: #0000FF;
    }
    
    .token.function,
    .token.class-name {
      color: #795E26;
    }
    
    .token.regex,
    .token.important,
    .token.variable {
      color: #EE0000;
    }
    `
} 