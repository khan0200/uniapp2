const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'src', 'app', '(dashboard)', 'students', '[id]', 'StudentDetailClient.tsx');
let content = fs.readFileSync(filePath, 'utf8');

const targetStr = `                  Save
          </div>
        )
      }`;

const replacementStr = `                  Save
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleCancelEditing();
                  }}
                  className="bg-gray-500 hover:bg-gray-600 rounded text-white text-[11.5px] px-2 py-0.5 cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between gap-2 w-full">
              <div className="flex-1 min-w-0">
                {certVal && certVal !== 'NO CERTIFICATE' ? (
                  <div className="flex flex-col gap-1">
                    <div className="inline-flex flex-wrap items-center text-[13px] font-bold rounded-[4px] overflow-hidden shadow-sm">
                      <span className={\`\${certColor} text-white px-1.5 py-0.5 uppercase\`}>{certVal}</span>
                      <span className="bg-[#0052cc] text-white px-1.5 py-0.5">SCORE: {scoreVal || '—'}</span>
                    </div>
                    {(testDateVal || validDateVal) && (
                      <div className="flex items-center gap-2 text-[11px] text-[var(--foreground-muted)] font-medium mt-1">
                        {testDateVal && <span><span className="font-bold">Test:</span> {testDateVal}</span>}
                        {validDateVal && <span><span className="font-bold">Valid:</span> {validDateVal}</span>}
                      </div>
                    )}
                  </div>
                ) : (
                  <span className="text-[14px] font-semibold text-[#B91C1C]">Not provided</span>
                )}
              </div>
              {copiedField === String(certField) && (
                <CheckCircle2 className="h-4 w-4 text-[var(--success)] shrink-0 animate-in fade-in zoom-in-75 duration-200" />
              )}
            </div>
          )}
        </div>
      </div>
    )
  }`;

content = content.replace(targetStr, replacementStr);
fs.writeFileSync(filePath, content, 'utf8');
console.log('Fixed JSX');
