export default { output: 'export', images: { unoptimized: true }, distDir: process.env.NODE_ENV === 'development' ? '.next-dev' : '.next' };
