import { useEffect, useState } from 'react'
import Axios from 'axios'
import LinkToProfile from './LinkToProfile'
import { parseImgUrl, prettyBalance, timeAgo } from '../utils/common'
import useSWR from 'swr'
import Link from 'next/link'
import useStore from '../store'
import Modal from './Modal'
import near from '../lib/near'
import PlaceBidModal from './PlaceBidModal'
import JSBI from 'jsbi'
import { formatNearAmount, parseNearAmount } from 'near-api-js/lib/utils/format'

const BidItem = ({ data, userOwnership, token, fetchBid }) => {
	const store = useStore()
	const [showModal, setShowModal] = useState('')
	const [isLoading, setIsLoading] = useState(false)

	const fetcher = async (key) => {
		const resp = await axios.get(`${process.env.API_URL}/${key}`)
		if (resp.data.data.results.length > 0) {
			return resp.data.data.results[0]
		} else {
			return {}
		}
	}

	const { data: profile } = useSWR(
		`profiles?accountId=${data.accountId}`,
		fetcher
	)

	const acceptBid = async () => {
		const params = {
			ownerId: data.accountId,
			tokenId: token.tokenId,
			quantity:
				data.bidMarketData.quantity > userOwnership.quantity
					? userOwnership.quantity.toString()
					: data.bidMarketData.quantity.toString(),
		}
		setIsLoading(true)
		try {
			await near.contract.acceptBidMarketData(params, '50000000000000')
			setIsLoading(false)
			fetchBid()
		} catch (err) {
			console.log(err)
			setIsLoading(false)
		}
	}

	const updateBid = async (data) => {
		const params = {
			ownerId: store.currentUser,
			tokenId: token.tokenId,
			quantity: data.bidQuantity,
			amount: parseNearAmount(data.bidAmount),
		}

		const attachedDeposit = JSBI.multiply(
			JSBI.BigInt(data.bidQuantity),
			JSBI.BigInt(parseNearAmount(data.bidAmount))
		)

		if (
			JSBI.lessThan(JSBI.BigInt(store.userBalance.available), attachedDeposit)
		) {
			toast.show({
				text: (
					<div className="font-semibold text-center text-sm">
						Insufficient Balance
						<p className="mt-2">
							Available {prettyBalance(store.userBalance.available, 24, 6)} Ⓝ
						</p>
					</div>
				),
				type: 'error',
				duration: 2500,
			})
			setIsLoading(false)
			return
		}

		setIsLoading(true)
		await cancelBid(false)
		try {
			await near.contract.addBidMarketData(
				params,
				'50000000000000',
				attachedDeposit.toString()
			)
		} catch (err) {
			console.log(err)
		}
	}

	const cancelBid = async (fetchAfterCancel = true) => {
		const params = {
			ownerId: data.accountId,
			tokenId: token.tokenId,
		}
		setIsLoading(true)
		try {
			await near.contract.deleteBidMarketData(params, '50000000000000')
			fetchAfterCancel && setIsLoading(false)
			fetchAfterCancel && fetchBid()
		} catch (err) {
			console.log(err)
			setIsLoading(false)
		}
	}

	return (
		<>
			{showModal === 'acceptBid' && (
				<Modal close={(_) => setShowModal('')}>
					<div className="max-w-sm w-full p-4 bg-gray-100 m-auto rounded-md">
						<div>
							<h1 className="text-2xl font-bold text-gray-900 tracking-tight">
								Accept a Bid
							</h1>
							<p className="text-gray-900 mt-2">
								You are about to accept bid for <b>{token.metadata.name}</b>{' '}
								from <b>ahnaf.near</b>
							</p>
							<div className="text-gray-900 mt-4 text-2xl font-bold text-center">
								{`${prettyBalance(data.bidMarketData.amount, 24, 4)} Ⓝ `}
								<span className="font-normal text-base">for </span>
								{`${
									data.bidMarketData.quantity > userOwnership.quantity
										? userOwnership.quantity
										: data.bidMarketData.quantity
								} pcs`}
							</div>
							<div className="mt-4 text-center">
								<div className="flex justify-between">
									<div className="text-sm">Service Fee</div>
									<div>0.5 Ⓝ</div>
								</div>
								<div className="flex justify-between">
									<div className="text-sm">You will get</div>
									<div>
										{formatNearAmount(data.bidMarketData.amount) *
											data.bidMarketData.quantity >
										userOwnership.quantity
											? userOwnership.quantity
											: data.bidMarketData.quantity}{' '}
										Ⓝ
									</div>
								</div>
							</div>
							<div className="">
								<button
									disabled={isLoading}
									className="w-full outline-none h-12 mt-4 rounded-md bg-transparent text-sm font-semibold border-2 px-4 py-2 border-primary bg-primary text-gray-100"
									onClick={acceptBid}
								>
									{isLoading ? 'Accepting...' : 'Accept Bid'}
								</button>
								<button
									disabled={isLoading}
									className="w-full outline-none h-12 mt-4 rounded-md bg-transparent text-sm font-semibold border-2 px-4 py-2 border-primary text-primary"
									onClick={() => setShowModal('')}
								>
									Cancel
								</button>
							</div>
						</div>
					</div>
				</Modal>
			)}
			{showModal === 'updateBid' && (
				<PlaceBidModal
					bidAmount={prettyBalance(data.bidMarketData.amount, 24, 4)}
					bidQuantity={data.bidMarketData.quantity}
					isSubmitting={isLoading}
					localToken={token}
					onCancel={() => setShowModal('')}
					onSubmitForm={updateBid}
				/>
			)}
			{showModal === 'cancelBid' && (
				<Modal
					close={() => setShowModal('')}
					closeOnBgClick={false}
					closeOnEscape={false}
				>
					<div className="w-full max-w-xs p-4 m-auto bg-gray-100 rounded-md overflow-y-auto max-h-screen">
						<div className="w-full">Are you sure to delete your bids?</div>
						<div className="flex space-x-4">
							<button
								disabled={isLoading}
								className="w-full outline-none h-12 mt-4 rounded-md bg-transparent text-sm font-semibold border-2 px-4 py-2 border-primary bg-primary text-gray-100"
								onClick={cancelBid}
							>
								{isLoading ? 'Deleting...' : 'Delete'}
							</button>
							<button
								disabled={isLoading}
								className="w-full outline-none h-12 mt-4 rounded-md bg-transparent text-sm font-semibold border-2 px-4 py-2 border-primary bg-white text-primary"
								onClick={() => setShowModal('')}
							>
								Cancel
							</button>
						</div>
					</div>
				</Modal>
			)}
			<div className="m-auto border-2 border-dashed my-4 p-2 rounded-md">
				<div className="flex justify-between items-center">
					<div className="flex items-center overflow-hidden">
						<Link href={`/${data.accountId}`}>
							<div className="w-8 h-8 flex-shrink-0 rounded-full overflow-hidden cursor-pointer bg-primary">
								{profile && (
									<img
										className="object-cover"
										src={parseImgUrl(profile.imgUrl)}
									/>
								)}
							</div>
						</Link>
						<div className="px-2">
							<LinkToProfile accountId={data.accountId} len={20} />
						</div>
					</div>
					<p className="mt-1 text-sm">{timeAgo.format(data.createdAt)}</p>
				</div>
				<div className="flex items-center justify-between mt-2">
					<div>
						<span>Bid {prettyBalance(data.bidMarketData.amount, 24, 4)} Ⓝ</span>
						<span> for {data.bidMarketData.quantity} pcs</span>
					</div>
					{userOwnership && store.currentUser !== data.accountId && (
						<button
							className="font-semibold w-24 rounded-md bg-primary text-white"
							onClick={() => setShowModal('acceptBid')}
						>
							Accept
						</button>
					)}
					{store.currentUser === data.accountId && (
						<div className="flex space-x-1">
							<button
								onClick={() => setShowModal('updateBid')}
								className="font-semibold w-24 rounded-md border-primary border-2 text-primary"
							>
								Update
							</button>
							<div
								onClick={() => setShowModal('cancelBid')}
								className="border-2 border-red-700 px-1 flex items-center justify-center rounded-md"
							>
								<svg
									width="16"
									height="16"
									viewBox="0 0 16 16"
									fill="none"
									xmlns="http://www.w3.org/2000/svg"
								>
									<path
										fillRule="evenodd"
										clipRule="evenodd"
										d="M8.00008 9.41423L3.70718 13.7071L2.29297 12.2929L6.58586 8.00001L2.29297 3.70712L3.70718 2.29291L8.00008 6.5858L12.293 2.29291L13.7072 3.70712L9.41429 8.00001L13.7072 12.2929L12.293 13.7071L8.00008 9.41423Z"
										fill="#c53030"
									/>
								</svg>
							</div>
						</div>
					)}
				</div>
			</div>
		</>
	)
}

const BidList = ({ userOwnership, token }) => {
	const [bidList, setBidList] = useState([])
	const [isFetching, setIsFetching] = useState(true)

	useEffect(() => {
		_fetchData()
	}, [])

	const _fetchData = async () => {
		const res = await Axios(
			`${process.env.API_URL}/bids?tokenId=${token.tokenId}`
		)
		const newData = await res.data.data

		setBidList(newData.results)
		setIsFetching(false)
	}

	return (
		<div>
			{bidList.length === 0 && !isFetching && (
				<div className="border-2 border-dashed my-4 p-2 rounded-md text-center">
					<p className="text-gray-500 py-8 px-8">No bidding yet</p>
				</div>
			)}
			{isFetching && (
				<div className="border-2 border-dashed my-4 p-2 rounded-md text-center">
					<p className="my-2 text-center">Loading...</p>
				</div>
			)}
			{bidList.length !== 0 &&
				bidList.map((bid) => {
					return (
						<BidItem
							key={bid._id}
							data={bid}
							userOwnership={userOwnership}
							token={token}
							fetchBid={_fetchData}
						/>
					)
				})}
		</div>
	)
}

export default BidList
