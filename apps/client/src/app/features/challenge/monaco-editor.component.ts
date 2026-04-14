import {
  Component,
  ElementRef,
  ViewChild,
  Input,
  Output,
  EventEmitter,
  OnInit,
  OnDestroy,
  signal,
  OnChanges,
  SimpleChanges,
} from '@angular/core';
import { CommonModule } from '@angular/common';

const MONACO_VERSION = '0.52.2';
const MONACO_CDN = `https://cdn.jsdelivr.net/npm/monaco-editor@${MONACO_VERSION}/min/vs`;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare const require: any;

let monacoLoaded = false;
let monacoLoadPromise: Promise<void> | null = null;

/** Loads Monaco via its AMD loader from CDN (once, shared across instances). */
function loadMonaco(): Promise<void> {
  if (monacoLoaded) return Promise.resolve();
  if (monacoLoadPromise) return monacoLoadPromise;

  monacoLoadPromise = new Promise<void>((resolve, reject) => {
    const loaderScript = document.createElement('script');
    loaderScript.src = `${MONACO_CDN}/loader.js`;
    loaderScript.onload = () => {
      require.config({ paths: { vs: MONACO_CDN } });
      require(['vs/editor/editor.main'], () => {
        monacoLoaded = true;
        resolve();
      });
    };
    loaderScript.onerror = reject;
    document.head.appendChild(loaderScript);
  });

  return monacoLoadPromise;
}

@Component({
  standalone: true,
  imports: [CommonModule],
  selector: 'app-monaco-editor',
  templateUrl: './monaco-editor.component.html',
})
export class MonacoEditorComponent implements OnInit, OnDestroy, OnChanges {
  @ViewChild('editorContainer', { static: true }) containerRef!: ElementRef<HTMLDivElement>;

  @Input() value = '';
  @Input() language = 'typescript';
  @Input() height = '400px';
  @Output() valueChange = new EventEmitter<string>();

  loading = signal(true);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private editor: any = null;
  private suppressChange = false;

  async ngOnInit() {
    await loadMonaco();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const monaco = (window as any).monaco;
    this.editor = monaco.editor.create(this.containerRef.nativeElement, {
      value: this.value,
      language: this.language,
      theme: 'vs-dark',
      minimap: { enabled: false },
      fontSize: 14,
      lineNumbers: 'on',
      automaticLayout: true,
      scrollBeyondLastLine: false,
      tabSize: 2,
    });

    this.editor.onDidChangeModelContent(() => {
      if (!this.suppressChange) {
        this.valueChange.emit(this.editor.getValue());
      }
    });

    this.loading.set(false);
  }

  ngOnChanges(changes: SimpleChanges) {
    if (this.editor && changes['value'] && changes['value'].currentValue !== this.editor.getValue()) {
      this.suppressChange = true;
      this.editor.setValue(changes['value'].currentValue);
      this.suppressChange = false;
    }
    if (this.editor && changes['language']) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const monaco = (window as any).monaco;
      monaco.editor.setModelLanguage(this.editor.getModel(), changes['language'].currentValue);
    }
  }

  ngOnDestroy() {
    this.editor?.dispose();
  }
}
