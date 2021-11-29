import { Address, log, bigDecimal, bigInt } from "@graphprotocol/graph-ts";
import { Viral, Transfer } from "../generated/Viral/Viral";
import { ViralSwapRouter } from "../generated/Viral/ViralSwapRouter";
import { Token, Account, TransferEvent } from "../generated/schema";
import { toBigDecimal } from "./utils";

export function handleTransfer(event: Transfer): void {
  let pathAddress = new Array<Address>();
  pathAddress.push(
    Address.fromString("0x2FbC33DB923d9B4B6678e55d13e587a2CCb804bC")
  );
  pathAddress.push(
    Address.fromString("0x04068da6c83afcfa0e13ba15a6696662335d5b75")
  );

  let token = Token.load(event.address.toHexString());
  let fromAccount = Account.load(event.params.from.toHexString());
  let toAccount = Account.load(event.params.to.toHexString());
  let contract = Viral.bind(event.address);
  let viralSwapRouter = ViralSwapRouter.bind(
    Address.fromString("0xE5C7565B45C5109515b4dEE70330Be40d2D198fB")
  );
  let transferEvent = TransferEvent.load(
    event.transaction.hash
      .toHexString()
      .concat("-")
      .concat(event.logIndex.toString())
  );
  if (!transferEvent) {
    transferEvent = new TransferEvent(
      event.transaction.hash
        .toHexString()
        .concat("-")
        .concat(event.logIndex.toString())
    );
  }

  if (!token) {
    token = new Token(event.address.toHexString());
  }

  if (!fromAccount) {
    fromAccount = new Account(event.params.from.toHexString());
  }

  if (!toAccount) {
    toAccount = new Account(event.params.to.toHexString());
  }
  //Account Balance
  let senderBalanceCall = contract.try_balanceOf(event.params.from as Address);
  if (!senderBalanceCall.reverted) {
    fromAccount.balance = senderBalanceCall.value;
  } else {
    log.warning("SenderBalanceCall reverted", []);
  }

  let receiverBalanceCall = contract.try_balanceOf(event.params.to as Address);
  if (!receiverBalanceCall.reverted) {
    toAccount.balance = receiverBalanceCall.value;
  } else {
    log.warning("ReceiverBalanceCall reverted", []);
  }

  //Total Supply
  let totalSupplyCall = contract.try_totalSupply();
  if (!totalSupplyCall.reverted) {
    token.totalSupply = totalSupplyCall.value;
  } else {
    log.warning("TotalSupplyCall reverted", []);
  }

  //Referrer & Referral Balance
  let referrerOfSenderCall = contract.try_referrerOf(
    event.params.to as Address
  );
  if (!referrerOfSenderCall.reverted) {
    toAccount.referrer = referrerOfSenderCall.value.toHexString();
    let referrerOfSenderBalanceCall = contract.try_balanceOf(
      referrerOfSenderCall.value
    );
    if (!referrerOfSenderBalanceCall.reverted) {
      toAccount.referrerBalance = referrerOfSenderBalanceCall.value;
    } else {
      log.warning("ReferrerOfSenderBalanceCall reverted", []);
    }
  } else {
    log.warning("ReferrerOfSenderCall reverted", []);
  }

  let referralOfReceiverCall = contract.try_referrerOf(
    event.params.from as Address
  );
  if (!referralOfReceiverCall.reverted) {
    fromAccount.referrer = referralOfReceiverCall.value.toHexString();
    let referrerOfReceiverBalanceCall = contract.try_balanceOf(
      referralOfReceiverCall.value
    );
    if (!referrerOfReceiverBalanceCall.reverted) {
      fromAccount.referrerBalance = referrerOfReceiverBalanceCall.value;
    } else {
      log.warning("ReferrerOfReceiverBalanceCall reverted", []);
    }
  } else {
    log.warning("ReferralOfReceiverCall Reverted", []);
  }

  //Referrer USDC Amount
  let amountCallReferredTo = viralSwapRouter.try_getAmountsOut(
    toAccount.referrerBalance,
    pathAddress
  );
  if (!amountCallReferredTo.reverted) {
    toAccount.referrerUsdcBalance = amountCallReferredTo.value;
  } else {
    log.warning("AmountCallReferredTo reverted", []);
  }

  let amountCallReferredFrom = viralSwapRouter.try_getAmountsOut(
    fromAccount.referrerBalance,
    pathAddress
  );
  if (!amountCallReferredFrom.reverted) {
    fromAccount.referrerUsdcBalance = amountCallReferredFrom.value;
  } else {
    log.warning("amountCallReferredFrom reverted", []);
  }

  //Account USDC Amount
  let senderAmountCall = viralSwapRouter.try_getAmountsOut(
    toAccount.balance,
    pathAddress
  );
  if (!senderAmountCall.reverted) {
    toAccount.usdcValue = senderAmountCall.value;
  } else {
    log.warning("SenderAmountCall reverted", []);
  }

  let receiverAmountCall = viralSwapRouter.try_getAmountsOut(
    fromAccount.balance,
    pathAddress
  );
  if (!receiverAmountCall.reverted) {
    fromAccount.usdcValue = receiverAmountCall.value;
  } else {
    log.warning("ReceiverAmountCall reverted", []);
  }

  transferEvent.sender = fromAccount.id;
  transferEvent.receiver = toAccount.id;
  transferEvent.amount = event.params.value;
  transferEvent.blockNumber = event.block.number;
  transferEvent.timestamp = event.block.timestamp;

  token.blockNumber = event.block.number;
  token.timestamp = event.block.timestamp;

  fromAccount.blockNumber = event.block.number;
  fromAccount.timestamp = event.block.timestamp;

  toAccount.blockNumber = event.block.number;
  toAccount.timestamp = event.block.timestamp;

  fromAccount.save();
  transferEvent.save();
  toAccount.save();
  token.save();
}
