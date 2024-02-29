let blob = new Blob([`importScripts(${JSON.stringify(chrome.runtime.getURL("worker.js"))})`], {type: "text/javascript"})

let mimeRegex = /^image\/jxl(\s*;.*)?$/

let headers = {accept: "image/jxl"}

let createWorker = () => new Promise(f =>
{
	let worker = new Worker(URL.createObjectURL(blob))
	worker.postMessage(chrome.runtime.getURL(""))
	
	let i = 0
	worker.addEventListener("message", () =>
	{
		let load = async (img, src, descriptor) =>
		{
			// Note: If ‘src’ is empty, that might mean this ‘<img>’ element is a placeholder for scripting (very likely).
			// In any case, the request is likely to fail because the request will be made to the document’s base URL.
			// To avoid interfering with scripting behavior, loading the URL as JPEG XL shouldn’t be tried.
			if (!src) return
			
			img.removeAttribute("srcset")
			img.src = "data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw=="
			
			let receive = async ({data}) =>
			{
				if (data.id !== id) return
				worker.removeEventListener("message", receive)
				
				if (data.error)
				{
					img.removeAttribute("src")
					img.removeAttribute("srcset")
					dispatchError(img)
					return
				}
				
				if (descriptor)
				{
					img.removeAttribute("src")
					
					if (descriptor instanceof Array)
					{
						img.srcset = data.url + " " + descriptor[0]
						img.sizes = descriptor[1]
					}
					else
					{
						img.srcset = data.url + " " + descriptor
					}
				}
				else
				{
					img.src = data.url
				}
			}
			
			let controller = new AbortController()
			
			let response
			try
			{
				response = await fetch(new URL(src, document.baseURI), {signal: controller.signal, headers})
			}
			catch
			{
				dispatchError(img)
				throw new Error("network error")
			}
			
			if (!mimeRegex.test(response.headers.get("content-type") ?? "image/jxl"))
			{
				// controller.abort()
				// dispatchError(img)
				// throw new Error("image has wrong MIME type")
			}
			
			let buffer = await response.arrayBuffer()
			
			let id = i++
			
			worker.addEventListener("message", receive)
			worker.postMessage({id, buffer})
		}
		
		f(load)
	}, {once: true})
})

let load = (img, src, descriptor) =>
{
	if (loadJPEGXL) loadJPEGXL[n()](img, src, descriptor)
	else delegated.push([img, src, descriptor])
}

let i = -1
let n = () => i = (i + 1) % loadJPEGXL.length

addEventListener("error", event =>
{
	if (!(event.target instanceof HTMLImageElement)) return
	event.stopImmediatePropagation()
	if (event.target.closest("picture")) return
	
	let img = event.target
	let descriptor = findDescriptor(img, img.currentSrc, img.srcset)
	load(img, img.currentSrc, descriptor[1])
}, true)

let dispatchError = img =>
{
	let message = "JPEG XL image loading failed"
	img.dispatchEvent(
		new ErrorEvent(message,
		{
			error: new Error(message),
			message,
		}),
		"error",
	)
}

let loadJPEGXL
let delegated = []
let workers = []
for (let i = 0 ; i < navigator.hardwareConcurrency ; i++)
	workers.push(createWorker())

Promise.all(workers)
	.then(workers =>
	{
		loadJPEGXL = workers
		for (let [img, src, descriptor] of delegated) load(img, src, descriptor)
		delegated = undefined
	})

let findDescriptor = (img, currentSrc, srcset) =>
{
	if (currentSrc) currentSrc = new URL(currentSrc).href
	
	let srcs = srcset.split(",")
	
	let descriptor
	
	for (let [i, candidate] of srcs.entries())
	{
		let match = candidate.match(/^\s*([^]+?)(\s+[0-9]*[wx])?\s*$/)
		if (!match) continue
		
		let src = match[1]
		
		if (currentSrc && new URL(src, document.baseURI).href !== currentSrc)
			continue
		
		descriptor = match[2] ?? ""
		
		if (descriptor.endsWith("w"))
		{
			let size = node.sizes.split(",")[i]
			if (size)
			{
				descriptor = [descriptor, size]
			}
			else
			{
				descriptor = undefined
				continue
			}
		}
		
		if (!currentSrc)
			currentSrc = src
		
		break
	}
	
	return [currentSrc, descriptor]
}

new MutationObserver(mutations =>
{
	for (let mutation of mutations)
	for (let node of mutation.addedNodes)
	{
		if (!(node instanceof HTMLSourceElement)) continue
		if (!mimeRegex.test(node.type)) continue
		
		let picture = node.closest("picture")
		let img = picture.querySelector("img")
		if (!picture) continue
		if (!img) continue
		
		let descriptor = findDescriptor(img, undefined, node.srcset)
		if (!descriptor[0]) continue
		
		for (let source of picture.querySelectorAll("source"))
			source.remove()
		
		load(img, ...descriptor)
		
		return
	}
}).observe(document, {subtree: true, childList: true})
