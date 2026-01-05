import { toast } from 'sonner'
import { getAuthToken } from '@/lib/auth'
import { GITHUB_CONFIG } from '@/consts'
import { createCommit, createTree, getRef, listRepoFilesRecursive, type TreeItem, updateRef } from '@/lib/github-client'

export async function batchDeleteBlogs(slugs: string[]): Promise<void> {
	if (!slugs || slugs.length === 0) throw new Error('需要 slugs')

	const token = await getAuthToken()

	toast.info('正在获取分支信息...')
	const refData = await getRef(token, GITHUB_CONFIG.OWNER, GITHUB_CONFIG.REPO, `heads/${GITHUB_CONFIG.BRANCH}`)
	const latestCommitSha = refData.sha

    const treeItems: TreeItem[] = []

    for (const slug of slugs) {
        toast.info(`正在处理: ${slug}...`)
        const imagesPath = `public/images/${slug}`
        const imageFiles = await listRepoFilesRecursive(token, GITHUB_CONFIG.OWNER, GITHUB_CONFIG.REPO, imagesPath, GITHUB_CONFIG.BRANCH)
        
        for (const path of imageFiles) {
            treeItems.push({
                path,
                mode: '100644',
                type: 'blob',
                sha: null // Delete
            })
        }
        
        treeItems.push({
            path: `src/content/blog/${slug}.md`,
            mode: '100644',
            type: 'blob',
            sha: null
        })
        treeItems.push({
            path: `src/content/blog/${slug}.mdx`,
            mode: '100644',
            type: 'blob',
            sha: null
        })
    }

	toast.info('正在创建文件树...')
	const treeData = await createTree(token, GITHUB_CONFIG.OWNER, GITHUB_CONFIG.REPO, treeItems, latestCommitSha)
	
    const message = slugs.length === 1 ? `删除文章: ${slugs[0]}` : `批量删除文章: ${slugs.length} 篇`
    toast.info('正在创建提交...')
	const commitData = await createCommit(token, GITHUB_CONFIG.OWNER, GITHUB_CONFIG.REPO, message, treeData.sha, [latestCommitSha])

	toast.info('正在更新分支...')
	await updateRef(token, GITHUB_CONFIG.OWNER, GITHUB_CONFIG.REPO, `heads/${GITHUB_CONFIG.BRANCH}`, commitData.sha)

	toast.success('批量删除成功！请等待页面部署后刷新')
}
