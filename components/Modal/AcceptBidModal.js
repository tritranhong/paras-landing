import { formatNearAmount } from 'near-api-js/lib/utils/format'
import { prettyBalance } from 'utils/common'
import Modal from 'components/Modal'
import { useIntl } from 'hooks/useIntl'
import JSBI from 'jsbi'
import Button from 'components/Common/Button'

const AcceptBidModal = ({ onClose, token, data, storageFee, isLoading, onSubmitForm }) => {
	const { localeLn } = useIntl()

	const calculatePriceDistribution = () => {
		if (JSBI.greaterThan(JSBI.BigInt(data.price), JSBI.BigInt(0))) {
			let fee = JSBI.BigInt(500)

			const calcRoyalty =
				Object.keys(token.royalty).length > 0
					? JSBI.divide(
							JSBI.multiply(
								JSBI.BigInt(data.price),
								JSBI.BigInt(
									Object.values(token.royalty).reduce((a, b) => {
										return parseInt(a) + parseInt(b)
									}, 0)
								)
							),
							JSBI.BigInt(10000)
					  )
					: JSBI.BigInt(0)

			const calcFee = JSBI.divide(JSBI.multiply(JSBI.BigInt(data.price), fee), JSBI.BigInt(10000))

			const cut = JSBI.add(calcRoyalty, calcFee)

			const calcReceive = JSBI.subtract(JSBI.BigInt(data.price), cut)

			return {
				receive: formatNearAmount(calcReceive.toString()),
				royalty: formatNearAmount(calcRoyalty.toString()),
				fee: formatNearAmount(calcFee.toString()),
			}
		}

		return {
			receive: 0,
			royalty: 0,
			fee: 0,
		}
	}

	return (
		<Modal closeOnBgClick={false} closeOnEscape={false} close={onClose}>
			<div className="max-w-sm w-full p-4 bg-gray-800 m-auto rounded-md relative">
				<div>
					<h1 className="text-2xl font-bold text-white tracking-tight">
						{localeLn('Accept a Bid')}
					</h1>
					<p className="text-white mt-2">
						{localeLn('AboutToAcceptBid')} <b>{token.metadata.name}</b> {localeLn('From')}{' '}
						<b>{data.buyer_id}</b>
					</p>
					<div className="text-white mt-4 text-2xl font-bold text-center">
						{`${prettyBalance(data.price, 24, 4)} Ⓝ `}
					</div>
					<div className="mt-4 text-center text-white opacity-90">
						<div className="flex justify-between">
							<div className="text-sm">
								{localeLn('RoyaltyForArtist')} (
								{Object.keys(token.royalty).length === 0
									? `None`
									: `${
											Object.values(token.royalty).reduce((a, b) => {
												return parseInt(a) + parseInt(b)
											}, 0) / 100
									  }%`}
								)
							</div>
							<div>{calculatePriceDistribution().royalty} Ⓝ</div>
						</div>
						<div className="flex justify-between">
							<div className="text-sm">{localeLn('ServiceFee')} (5%)</div>
							<div>{calculatePriceDistribution().fee} Ⓝ</div>
						</div>
						<div className="flex justify-between">
							<div className="text-sm">{localeLn('YouWillGet')}</div>
							<div>{calculatePriceDistribution().receive} Ⓝ</div>
						</div>
					</div>
					<div className="mt-4 text-center">
						<div className="text-white my-1">
							<div className="flex justify-between">
								<div className="text-sm">{localeLn('StorageFee')}</div>
								<div className="text">{formatNearAmount(storageFee)} Ⓝ</div>
							</div>
						</div>
					</div>
					<p className="text-white mt-4 text-sm text-center opacity-90">
						{localeLn('RedirectedToconfirm')}
					</p>

					<div className="">
						<Button
							size="md"
							isFullWidth
							disabled={isLoading}
							className="w-full outline-none h-12 mt-4 rounded-md bg-transparent text-sm font-semibold border-2 px-4 py-2 border-primary bg-primary text-gray-100"
							onClick={onSubmitForm}
						>
							{isLoading ? 'Accepting...' : 'Accept Bid'}
						</Button>
						<Button
							className="mt-4"
							variant="ghost"
							size="md"
							isFullWidth
							onClick={onClose}
							isDisabled={isLoading}
						>
							{localeLn('Cancel')}
						</Button>
					</div>
				</div>
			</div>
		</Modal>
	)
}

export default AcceptBidModal
