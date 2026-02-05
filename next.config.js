/** @type {import('next').NextConfig} */
const nextConfig = {
    output: "standalone",
    transpilePackages: ["ckeditor5", "@ckeditor/ckeditor5-react"],
}

module.exports = nextConfig
