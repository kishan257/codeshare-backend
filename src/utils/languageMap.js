export const JUDGE0_LANGUAGE_IDS = {
  javascript: 63,
  nodejs: 63,
  python: 71,
  cpp: 54
};

export const DEFAULT_TEMPLATES = {
  javascript: 'console.log("Hello, CodeShare!");',
  nodejs: 'console.log("Hello from Node.js");',
  python: 'print("Hello, CodeShare!")',
  cpp: `#include <iostream>
using namespace std;

int main() {
  cout << "Hello, CodeShare!" << endl;
  return 0;
}`,
  html: `<!doctype html>
<html>
  <head>
    <title>CodeShare HTML</title>
  </head>
  <body>
    <h1>Hello from HTML</h1>
  </body>
</html>`,
  css: `body {
  margin: 0;
  font-family: Inter, sans-serif;
  background: #0f172a;
  color: #e2e8f0;
}`,
  reactjs: `export default function App() {
  return (
    <main style={{ padding: 24 }}>
      <h1>Hello from React.js</h1>
    </main>
  );
}`,
  nextjs: `export default function Page() {
  return (
    <section style={{ padding: 24 }}>
      <h1>Hello from Next.js</h1>
    </section>
  );
}`
};
