import ExpoModulesCore
import CoreBluetooth

/**
 * CoreBluetooth peripheral controller: advertises the hereherehere GATT service
 * with a writable RX characteristic (central → us) and a notify TX
 * characteristic (us → central). The frame protocol is symmetric, so this drops
 * in behind the same link the central uses. Kept as a standalone NSObject
 * delegate so the Expo Module class needn't conform to CBPeripheralManagerDelegate.
 */
final class PeripheralController: NSObject, CBPeripheralManagerDelegate {
  private var manager: CBPeripheralManager?
  private var rxChar: CBMutableCharacteristic?
  private var txChar: CBMutableCharacteristic?
  private var serviceUUID: CBUUID?
  private var rxUUID: CBUUID?
  private var txUUID: CBUUID?
  private var wantAdvertising = false
  private var serviceAdded = false

  // Subscribed centrals, keyed by their identifier string.
  private var centrals: [String: CBCentral] = [:]
  // Outbound frames awaiting a free transmit queue (CoreBluetooth backpressure).
  private var pending: [(central: CBCentral?, data: Data)] = []

  var onReceive: ((String, String) -> Void)?
  var onConnect: ((String) -> Void)?
  var onDisconnect: ((String) -> Void)?
  var onState: ((Int) -> Void)?

  func start(service: String, rx: String, tx: String) {
    serviceUUID = CBUUID(string: service)
    rxUUID = CBUUID(string: rx)
    txUUID = CBUUID(string: tx)
    wantAdvertising = true
    serviceAdded = false
    if manager == nil {
      manager = CBPeripheralManager(delegate: self, queue: nil)
    } else {
      setupAndAdvertise()
    }
  }

  func stop() {
    wantAdvertising = false
    manager?.stopAdvertising()
    manager?.removeAllServices()
    serviceAdded = false
    centrals.removeAll()
    pending.removeAll()
  }

  /// Returns false if the transmit queue was full; the caller may retry after a
  /// short delay (we also auto-flush on `peripheralManagerIsReady`).
  func notify(centralId: String, data: Data) -> Bool {
    guard let tx = txChar, let manager = manager else { return false }
    let target = centrals[centralId]
    let subscribers = target.map { [$0] }
    let ok = manager.updateValue(data, for: tx, onSubscribedCentrals: subscribers)
    if !ok { pending.append((target, data)) }
    return ok
  }

  private func setupAndAdvertise() {
    guard let manager = manager, manager.state == .poweredOn,
          let su = serviceUUID, let ru = rxUUID, let tu = txUUID else { return }
    manager.stopAdvertising()
    manager.removeAllServices()

    let rx = CBMutableCharacteristic(
      type: ru,
      properties: [.write, .writeWithoutResponse],
      value: nil,
      permissions: [.writeable])
    let tx = CBMutableCharacteristic(
      type: tu,
      properties: [.notify],
      value: nil,
      permissions: [.readable])
    let service = CBMutableService(type: su, primary: true)
    service.characteristics = [rx, tx]
    rxChar = rx
    txChar = tx
    manager.add(service)
  }

  // MARK: - CBPeripheralManagerDelegate

  func peripheralManagerDidUpdateState(_ peripheral: CBPeripheralManager) {
    onState?(peripheral.state.rawValue)
    if peripheral.state == .poweredOn && wantAdvertising {
      setupAndAdvertise()
    }
  }

  func peripheralManager(_ peripheral: CBPeripheralManager, didAdd service: CBService, error: Error?) {
    guard error == nil, wantAdvertising, let su = serviceUUID, !serviceAdded else { return }
    serviceAdded = true
    peripheral.startAdvertising([CBAdvertisementDataServiceUUIDsKey: [su]])
  }

  func peripheralManager(_ peripheral: CBPeripheralManager, didReceiveWrite requests: [CBATTRequest]) {
    for request in requests {
      if let value = request.value {
        onReceive?(request.central.identifier.uuidString, value.base64EncodedString())
      }
    }
    // Acknowledge the batch (central uses write-with-response).
    if let first = requests.first {
      peripheral.respond(to: first, withResult: .success)
    }
  }

  func peripheralManager(_ peripheral: CBPeripheralManager,
                         central: CBCentral,
                         didSubscribeTo characteristic: CBCharacteristic) {
    let id = central.identifier.uuidString
    centrals[id] = central
    onConnect?(id)
  }

  func peripheralManager(_ peripheral: CBPeripheralManager,
                         central: CBCentral,
                         didUnsubscribeFrom characteristic: CBCharacteristic) {
    let id = central.identifier.uuidString
    centrals.removeValue(forKey: id)
    onDisconnect?(id)
  }

  func peripheralManagerIsReady(toUpdateSubscribers peripheral: CBPeripheralManager) {
    guard let tx = txChar else { return }
    while let next = pending.first {
      let subscribers = next.central.map { [$0] }
      let ok = peripheral.updateValue(next.data, for: tx, onSubscribedCentrals: subscribers)
      if ok { pending.removeFirst() } else { break }
    }
  }
}

public class HhhBlePeripheralModule: Module {
  private let controller = PeripheralController()

  public func definition() -> ModuleDefinition {
    Name("HhhBlePeripheral")

    Events("onReceive", "onCentralConnect", "onCentralDisconnect", "onStateChange")

    OnCreate {
      self.controller.onReceive = { [weak self] centralId, dataB64 in
        self?.sendEvent("onReceive", ["centralId": centralId, "data": dataB64])
      }
      self.controller.onConnect = { [weak self] centralId in
        self?.sendEvent("onCentralConnect", ["centralId": centralId])
      }
      self.controller.onDisconnect = { [weak self] centralId in
        self?.sendEvent("onCentralDisconnect", ["centralId": centralId])
      }
      self.controller.onState = { [weak self] state in
        self?.sendEvent("onStateChange", ["state": state])
      }
    }

    AsyncFunction("startAdvertising") { (serviceUUID: String, rxUUID: String, txUUID: String) in
      self.controller.start(service: serviceUUID, rx: rxUUID, tx: txUUID)
    }

    Function("stopAdvertising") {
      self.controller.stop()
    }

    AsyncFunction("notify") { (centralId: String, dataB64: String) -> Bool in
      guard let data = Data(base64Encoded: dataB64) else { return false }
      return self.controller.notify(centralId: centralId, data: data)
    }
  }
}
