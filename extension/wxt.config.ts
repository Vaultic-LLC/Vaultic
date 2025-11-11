import { defineConfig } from 'wxt';
import { babel } from '@rollup/plugin-babel';

// Custom plugin to fix class initialization order issues by moving child classes after their parent classes
function reorderVaulticEntityPlugin() {
  return {
    name: 'reorder-vaultic-entity',
    renderChunk(code: string, chunk: any) {
      let workingCode = code;
      
      // Process base classes in order: VaulticEntity first, then StoreState
      // This ensures the hierarchy is correct (StoreState extends VaulticEntity)
      const baseClassesToProcess = [
        { name: 'VaulticEntity', pattern: /(const _VaulticEntity = [\s\S]*?let VaulticEntity = _VaulticEntity;)/ },
        { name: 'StoreState' } // StoreState uses manual extraction
      ];
      
      for (const baseClass of baseClassesToProcess) {
        // Extract base class code
        let baseClassCode;
        let baseClassStartPos;
        
        if (baseClass.name === 'StoreState') {
          // Manual extraction for StoreState
          const startPos = workingCode.indexOf(`let ${baseClass.name} =`);
          if (startPos === -1) continue;
          
          // Find ending pattern }(VaulticEntity);
          const afterStart = workingCode.substring(startPos);
          const endMarker = '}(VaulticEntity)';
          const endIndex = afterStart.indexOf(endMarker);
          if (endIndex === -1) continue;
          
          // Find semicolon after marker
          const afterMarker = afterStart.substring(endIndex + endMarker.length);
          const semiIndex = afterMarker.indexOf(';');
          if (semiIndex === -1) continue;
          
          const endPos = startPos + endIndex + endMarker.length + semiIndex + 1;
          baseClassCode = workingCode.substring(startPos, endPos);
          baseClassStartPos = startPos;
        } else {
          // Regex extraction for VaulticEntity
          if (!baseClass.pattern) continue;
          const baseClassMatch = workingCode.match(baseClass.pattern);
          if (!baseClassMatch) continue;
          
          baseClassCode = baseClassMatch[1];
          baseClassStartPos = workingCode.indexOf(baseClassCode);
        }
        
        // Find ALL classes that extend this base class BEFORE its definition
        const beforeBaseClass = workingCode.substring(0, baseClassStartPos);
        const childClasses: Array<{name: string, pos: number}> = [];
        
        // Pattern: }(BaseClassName); with "return ClassName;" before it
        const childPattern = new RegExp(`return\\s+(\\w+);\\s*\\}\\(${baseClass.name}\\)`, 'g');
        let match;
        
        while ((match = childPattern.exec(beforeBaseClass)) !== null) {
          const className = match[1];
          const matchPos = match.index;
          
          // Find where this class is declared (var/let/const ClassName = ...)
          const searchStart = Math.max(0, matchPos - 5000);
          const snippet = beforeBaseClass.substring(searchStart, matchPos);
          
          // Look for "var ClassName = " or "var _ClassName = " (with optional underscore prefix)
          const declPattern = new RegExp(`(?:var|let|const)\\s+_?${className}\\s*=`, 'g');
          let declMatch;
          let lastDeclPos = -1;
          
          // Find the LAST occurrence of this declaration (closest to the return statement)
          while ((declMatch = declPattern.exec(snippet)) !== null) {
            lastDeclPos = searchStart + declMatch.index;
          }
          
          if (lastDeclPos !== -1) {
            childClasses.push({
              name: className,
              pos: lastDeclPos
            });
          }
        }
        
        if (childClasses.length === 0) {
          continue;
        }
        
        // Find where base class ends (including its decorator calls)
        const afterBase = workingCode.substring(baseClassStartPos + baseClassCode.length);
        
        // Find the end of base class's decorator section
        let decoratorEndPos = baseClassStartPos + baseClassCode.length;
        const decoratorPattern = /__decorateClass[^;]+;/g;
        let searchOffset = 0;
        const searchLimit = 5000;
        
        while (searchOffset < searchLimit) {
          const snippet = afterBase.substring(searchOffset, searchOffset + 200);
          const decMatch = decoratorPattern.exec(snippet);
          if (decMatch && decMatch[0].includes(baseClass.name)) {
            decoratorEndPos = baseClassStartPos + baseClassCode.length + searchOffset + decMatch.index + decMatch[0].length;
            searchOffset += decMatch.index + decMatch[0].length;
            decoratorPattern.lastIndex = 0;
          } else {
            break;
          }
        }
        
        // Extract each child class's full code
        const childClassesToMove: Array<{name: string, code: string, pos: number, endPos: number}> = [];
        
        for (const child of childClasses) {
          const startPos = child.pos;
          const afterChild = workingCode.substring(startPos);
          const endMatch = afterChild.match(new RegExp(`return\\s+\\w+;\\s*\\}\\(${baseClass.name}\\);`));
          
          if (endMatch) {
            const endPos = startPos + afterChild.indexOf(endMatch[0]) + endMatch[0].length;
            
            // Also include decorator calls right after the class
            let decoratorEnd = endPos;
            const afterClass = workingCode.substring(endPos, endPos + 2000);
            const classDecoratorPattern = new RegExp(`__decorateClass[^;]+${child.name}[^;]+;`, 'g');
            let classDecMatch;
            while ((classDecMatch = classDecoratorPattern.exec(afterClass)) !== null) {
              decoratorEnd = endPos + classDecMatch.index + classDecMatch[0].length;
            }
            
            const fullCode = workingCode.substring(startPos, decoratorEnd);
            childClassesToMove.push({
              name: child.name,
              code: fullCode,
              pos: startPos,
              endPos: decoratorEnd
            });
          }
        }
        
        // Remove all child classes (in reverse order to maintain positions)
        childClassesToMove.sort((a, b) => b.pos - a.pos);
        
        for (const child of childClassesToMove) {
          workingCode = workingCode.substring(0, child.pos) + workingCode.substring(child.endPos);
        }
        
        // Find the insertion point: right after base class's decorators
        // Adjust the position based on removed child classes
        let insertPos = decoratorEndPos;
        for (const child of childClassesToMove) {
          if (child.pos < decoratorEndPos) {
            insertPos -= (child.endPos - child.pos);
          }
        }
        
        // Build the moved classes code (restore original order)
        childClassesToMove.sort((a, b) => a.pos - b.pos);
        const movedCode = '\n\n' + childClassesToMove.map(c => c.code).join('\n\n') + '\n';
        
        // Insert after base class
        workingCode = workingCode.substring(0, insertPos) + movedCode + workingCode.substring(insertPos);
      }
      
      return { code: workingCode, map: null };
    }
  };
}

// See https://wxt.dev/api/config.html
export default defineConfig({
  modules: ['@wxt-dev/module-vue'],
  manifest: {
    permissions: ['storage'],
    host_permissions: [
      'https://*.vaulticserver.vaultic.co/*',
      'https://vaultic-sts.vaulticserver.vaultic.co/*'
    ]
  },
  vite: () => ({
    plugins: [
      babel({
        babelHelpers: 'bundled',
        plugins: [
          '@babel/plugin-transform-class-properties',
          ['@babel/plugin-transform-classes', { loose: true }],
          '@babel/plugin-transform-object-rest-spread'
        ],
        extensions: ['.js', '.jsx', '.ts', '.tsx'],
        exclude: 'node_modules/**'
      }),
      reorderVaulticEntityPlugin()
    ],
    build: {
      target: 'es2020',  // ES2020+ supports BigInt and exponentiation operator
      minify: false,  // Easier to debug
      rollupOptions: {
        output: {
          manualChunks: undefined,
          format: 'iife',
          inlineDynamicImports: true,
          banner: (chunk) => {
            // Inject window polyfill for service worker/background script
            if (chunk.name === 'background') {
              return `// Polyfill window for service worker context
if (typeof window === 'undefined') {
  globalThis.window = globalThis;
}
if (typeof document === 'undefined') {
  globalThis.document = {};
}
if (typeof navigator === 'undefined') {
  globalThis.navigator = globalThis.navigator || {};
}
// Ensure localforage is available on window if it exists on globalThis
if (typeof globalThis.localforage !== 'undefined' && typeof window !== 'undefined') {
  window.localforage = globalThis.localforage;
}
`;
            }
            return '';
          }
        }
      }
    }
  })
});
