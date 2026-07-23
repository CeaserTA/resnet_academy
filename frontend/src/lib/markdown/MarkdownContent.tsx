import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneLight } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { cn } from '@/lib/utils';

/**
 * Renders a post/reply `body` (plain Markdown text, no schema change) as real formatted content
 * — bold/italic/lists/links plus syntax-highlighted fenced code blocks. `pre` is overridden to a
 * pass-through fragment so the syntax highlighter's own `<pre>` doesn't end up double-nested
 * (the standard react-markdown + react-syntax-highlighter integration pattern); `code` tells
 * inline spans (no `language-*` className) from fenced blocks (which get one from the fence's
 * info string, e.g. ` ```dart `) via that className.
 */
export function MarkdownContent({ children, className }: { children: string; className?: string }) {
    return (
        <div className={cn('flex flex-col gap-2', className)}>
            <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                    p: ({ children }) => <p className="text-sm text-ink-900">{children}</p>,
                    strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
                    em: ({ children }) => <em className="italic">{children}</em>,
                    ul: ({ children }) => <ul className="ml-5 list-disc text-sm text-ink-900">{children}</ul>,
                    ol: ({ children }) => <ol className="ml-5 list-decimal text-sm text-ink-900">{children}</ol>,
                    li: ({ children }) => <li className="mt-0.5">{children}</li>,
                    a: ({ href, children }) => (
                        <a href={href} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">
                            {children}
                        </a>
                    ),
                    blockquote: ({ children }) => (
                        <blockquote className="border-l-2 border-surface-100 pl-3 text-sm text-ink-600">{children}</blockquote>
                    ),
                    pre: ({ children }) => <>{children}</>,
                    code(props) {
                        const { className: codeClassName, children: codeChildren, ...rest } = props;
                        const match = /language-(\w+)/.exec(codeClassName ?? '');

                        if (match) {
                            return (
                                <SyntaxHighlighter
                                    language={match[1]}
                                    style={oneLight}
                                    customStyle={{ margin: 0, borderRadius: '0.375rem', fontSize: '0.8125rem' }}
                                >
                                    {String(codeChildren).replace(/\n$/, '')}
                                </SyntaxHighlighter>
                            );
                        }

                        return (
                            <code className="rounded bg-surface-100 px-1 py-0.5 font-mono text-[0.8125em] text-ink-900" {...rest}>
                                {codeChildren}
                            </code>
                        );
                    },
                }}
            >
                {children}
            </ReactMarkdown>
        </div>
    );
}
