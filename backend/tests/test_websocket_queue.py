
import asyncio
import pytest
from unittest.mock import AsyncMock, MagicMock
from fastapi import WebSocket
from backend.src.api.websocket_manager import TypedConnection
from backend.src.api.websocket_types import MessageFactory

@pytest.mark.asyncio
async def test_queue_size_tracking():
    # Mock WebSocket
    mock_ws = AsyncMock(spec=WebSocket)

    # We need to simulate slow sending to build up queue
    # Create an event to control when send_json returns
    send_event = asyncio.Event()

    async def slow_send_json(data):
        await send_event.wait()

    mock_ws.send_json.side_effect = slow_send_json

    connection_id = "test_conn_1"
    connection = TypedConnection(mock_ws, connection_id)

    # Create a dummy message
    msg = MessageFactory.ping(sequence=1)

    # Send multiple messages. Since send_json is blocked, they should queue up.
    # Note: The first message will be picked up by the loop and stuck in 'await send_json'.
    # Subsequent messages will be in the queue.

    await connection.send_message(msg)
    await connection.send_message(msg)
    await connection.send_message(msg)

    # Give the background task a moment to pick up the first message
    await asyncio.sleep(0.01)

    # Check queue size.
    # 3 sent: 1 should be processing (removed from queue), 2 should be in queue.
    # queue_size reflects what is in the queue, not what is currently being sent.
    assert connection.queue_size == 2

    # Release the blockage
    send_event.set()

    # Wait for processing
    # We need to give enough time for the loop to process all messages
    # Since side_effect is just a function, it will run for all calls.
    # Once event is set, all pending awaits on wait() will resolve.
    # However, since it is a loop, they happen sequentially.

    # Wait until queue is empty
    for _ in range(10):
        if connection.queue_size == 0:
            break
        await asyncio.sleep(0.01)

    assert connection.queue_size == 0

    # Cleanup
    await connection.close()

@pytest.mark.asyncio
async def test_broadcast_failure_handling():
    # Verify that if send fails (e.g. connection closed), the loop handles it gracefully
    # and subsequent sends might fail or queue up until closed.

    mock_ws = AsyncMock(spec=WebSocket)
    mock_ws.send_json.side_effect = Exception("Connection closed")

    connection = TypedConnection(mock_ws, "test_conn_fail")
    msg = MessageFactory.ping(sequence=1)

    await connection.send_message(msg)

    # Wait for loop to process and fail
    await asyncio.sleep(0.01)

    # The loop should have exited.
    # Currently _send_loop breaks on exception.

    assert connection._write_task.done()

    # Sending more messages should raise RuntimeError because task is done
    with pytest.raises(RuntimeError):
        await connection.send_message(msg)

    await connection.close()
